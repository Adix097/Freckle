package com.plugin.player

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.stream.StreamInfo
import kotlin.concurrent.thread

@InvokeArg
class PlayArgs {
    var id: String? = null
    var title: String? = null
    var artist: String? = null
    var cover: String? = null
}

@TauriPlugin
class PlayerPlugin(private val activity: Activity) : Plugin(activity) {
    private var controller: MediaController? = null
    private var lastError: String = ""
    private var initialized = false

    override fun load(webView: WebView) {
        super.load(webView)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
        }
        val token = SessionToken(activity, ComponentName(activity, PlaybackService::class.java))
        val future = MediaController.Builder(activity, token).buildAsync()
        future.addListener({
            try {
                val c = future.get()
                c.addListener(object : Player.Listener {
                    override fun onPlayerError(error: PlaybackException) {
                        lastError = "${error.errorCodeName}: ${error.message}"
                    }
                })
                controller = c
            } catch (e: Throwable) {
                lastError = "Controller: $e"
            }
        }, ContextCompat.getMainExecutor(activity))
    }

    @Synchronized
    private fun ensureInit() {
        if (!initialized) {
            NewPipe.init(AppDownloader(), Localization("en", "US"))
            initialized = true
        }
    }

    private fun resolveUrl(id: String): String {
        ensureInit()
        val info = StreamInfo.getInfo(ServiceList.YouTube, "https://www.youtube.com/watch?v=$id")
        val best = info.audioStreams
            .filter { it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP && !it.content.isNullOrEmpty() }
            .maxByOrNull { it.averageBitrate }
            ?: throw Exception("No audio stream found")
        return best.content
    }

    private fun onMain(invoke: Invoke, f: (MediaController) -> Unit) {
        activity.runOnUiThread {
            val c = controller
            if (c == null) {
                invoke.reject("Player service not connected yet")
            } else {
                try {
                    f(c)
                    invoke.resolve()
                } catch (e: Throwable) {
                    invoke.reject(e.toString())
                }
            }
        }
    }

    @Command
    fun resolve(invoke: Invoke) {
        val a = invoke.parseArgs(PlayArgs::class.java)
        thread {
            try {
                val r = JSObject()
                r.put("url", resolveUrl(a.id ?: throw Exception("missing id")))
                invoke.resolve(r)
            } catch (e: Throwable) {
                invoke.reject(e.message ?: e.toString())
            }
        }
    }

    @Command
    fun play(invoke: Invoke) {
        val a = invoke.parseArgs(PlayArgs::class.java)
        thread {
            try {
                val url = resolveUrl(a.id ?: throw Exception("missing id"))
                activity.runOnUiThread {
                    val c = controller
                    if (c == null) {
                        invoke.reject("Player service not connected yet")
                        return@runOnUiThread
                    }
                    lastError = ""
                    val meta = MediaMetadata.Builder()
                        .setTitle(a.title ?: "Unknown")
                        .setArtist(a.artist ?: "")
                        .apply { a.cover?.let { setArtworkUri(Uri.parse(it)) } }
                        .build()
                    c.setMediaItem(MediaItem.Builder().setUri(url).setMediaMetadata(meta).build())
                    c.prepare()
                    c.play()
                    invoke.resolve()
                }
            } catch (e: Throwable) {
                invoke.reject(e.message ?: e.toString())
            }
        }
    }

    @Command
    fun pause(invoke: Invoke) = onMain(invoke) { it.pause() }

    @Command
    fun resume(invoke: Invoke) = onMain(invoke) { it.play() }

    @Command
    fun stop(invoke: Invoke) = onMain(invoke) {
        it.stop()
        it.clearMediaItems()
    }

    @Command
    fun state(invoke: Invoke) {
        activity.runOnUiThread {
            val c = controller
            val r = JSObject()
            r.put("connected", c != null)
            if (c != null) {
                r.put("playing", c.isPlaying)
                r.put("playbackState", c.playbackState)
                r.put("position", c.currentPosition)
                r.put("duration", c.duration.coerceAtLeast(0))
            }
            r.put("error", lastError)
            invoke.resolve(r)
        }
    }
}