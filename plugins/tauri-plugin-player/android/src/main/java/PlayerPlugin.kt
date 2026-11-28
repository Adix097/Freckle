package com.plugin.player

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
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
import org.json.JSONArray

@InvokeArg
class QueueArgs {
    var items: String = "[]"
    var index: Int = 0
    var play: Boolean = true
    var position: Long = 0
}

@InvokeArg
class IndexArgs {
    var index: Int = 0
}

@InvokeArg
class SeekArgs {
    var ms: Long = 0
}

@InvokeArg
class AckArgs {
    var upTo: Long = 0
}

@TauriPlugin
class PlayerPlugin(private val activity: Activity) : Plugin(activity) {
    private var controller: MediaController? = null
    private val pending = ArrayList<Pair<Invoke, (MediaController) -> Unit>>()
    private var lastError = ""

    override fun load(webView: WebView) {
        super.load(webView)
        if (Build.VERSION.SDK_INT >= 33 &&
                        ContextCompat.checkSelfPermission(
                                activity,
                                Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    7001
            )
        }
        val token = SessionToken(activity, ComponentName(activity, PlaybackService::class.java))
        val future = MediaController.Builder(activity, token).buildAsync()
        future.addListener(
                {
                    try {
                        val c = future.get()
                        c.addListener(
                                object : Player.Listener {
                                    override fun onPlayerError(error: PlaybackException) {
                                        lastError = "${error.errorCodeName}: ${error.message}"
                                    }

                                    override fun onMediaItemTransition(
                                            mediaItem: MediaItem?,
                                            reason: Int
                                    ) {
                                        lastError = ""
                                    }
                                }
                        )
                        controller = c
                        pending.forEach { (inv, f) -> exec(inv, c, f) }
                        pending.clear()
                    } catch (e: Throwable) {
                        lastError = "Controller: $e"
                        pending.forEach { (inv, _) -> inv.reject(lastError) }
                        pending.clear()
                    }
                },
                ContextCompat.getMainExecutor(activity)
        )
    }

    private fun exec(invoke: Invoke, c: MediaController, f: (MediaController) -> Unit) {
        try {
            f(c)
        } catch (e: Throwable) {
            invoke.reject(e.toString())
        }
    }

    private fun withC(invoke: Invoke, f: (MediaController) -> Unit) {
        activity.runOnUiThread {
            val c = controller
            if (c != null) exec(invoke, c, f) else pending.add(invoke to f)
        }
    }

    private fun wake(c: MediaController) {
        if (c.playbackState == Player.STATE_IDLE && c.mediaItemCount > 0) c.prepare()
    }

    private fun parse(json: String): List<MediaItem> {
        val arr = JSONArray(json)
        return (0 until arr.length()).map { Store.toItem(arr.getJSONObject(it)) }
    }

    @Command
    fun setQueue(invoke: Invoke) {
        val a = invoke.parseArgs(QueueArgs::class.java)
        withC(invoke) { c ->
            lastError = ""
            val list = parse(a.items)
            if (list.isEmpty()) {
                c.clearMediaItems()
            } else {
                c.setMediaItems(list, a.index.coerceIn(0, list.size - 1), a.position)
                if (a.play) {
                    c.prepare()
                    c.play()
                }
            }
            invoke.resolve()
        }
    }

    @Command
    fun jump(invoke: Invoke) {
        val a = invoke.parseArgs(IndexArgs::class.java)
        withC(invoke) { c ->
            lastError = ""
            c.seekTo(a.index.coerceIn(0, maxOf(0, c.mediaItemCount - 1)), 0)
            wake(c)
            c.play()
            invoke.resolve()
        }
    }

    @Command
    fun toggle(invoke: Invoke) =
            withC(invoke) { c ->
                wake(c)
                if (c.playbackState == Player.STATE_ENDED) {
                    c.seekTo(c.currentMediaItemIndex, 0)
                    c.play()
                } else if (c.playWhenReady) {
                    c.pause()
                } else {
                    c.play()
                }
                invoke.resolve()
            }

    @Command
    fun next(invoke: Invoke) =
            withC(invoke) { c ->
                wake(c)
                c.seekToNext()
                c.play()
                invoke.resolve()
            }

    @Command
    fun prev(invoke: Invoke) =
            withC(invoke) { c ->
                wake(c)
                c.seekToPrevious()
                c.play()
                invoke.resolve()
            }

    @Command
    fun seek(invoke: Invoke) {
        val a = invoke.parseArgs(SeekArgs::class.java)
        withC(invoke) { c ->
            wake(c)
            c.seekTo(a.ms)
            invoke.resolve()
        }
    }

    @Command
    fun stop(invoke: Invoke) =
            withC(invoke) { c ->
                c.stop()
                c.clearMediaItems()
                Store.clearAll(activity)
                invoke.resolve()
            }

    @Command
    fun state(invoke: Invoke) =
            withC(invoke) { c ->
                val r = JSObject()
                r.put("connected", true)
                r.put("playWhenReady", c.playWhenReady)
                r.put("state", c.playbackState)
                r.put("position", c.currentPosition)
                r.put("duration", if (c.duration == C.TIME_UNSET) 0L else c.duration)
                r.put("index", c.currentMediaItemIndex)
                r.put("count", c.mediaItemCount)
                r.put("error", lastError)
                invoke.resolve(r)
            }

    @Command
    fun snapshot(invoke: Invoke) =
            withC(invoke) { c ->
                if (c.mediaItemCount == 0) {
                    val s = Store.saved(activity)
                    if (s != null) {
                        val list = parse(s.getJSONArray("items").toString())
                        if (list.isNotEmpty()) {
                            c.setMediaItems(
                                    list,
                                    s.optInt("index", 0).coerceIn(0, list.size - 1),
                                    s.optLong("position", 0)
                            )
                        }
                    }
                }
                val r = JSObject()
                r.put("items", Store.itemsJson(c))
                r.put("index", c.currentMediaItemIndex)
                r.put("position", c.currentPosition)
                r.put(
                        "playing",
                        c.playWhenReady &&
                                (c.playbackState == Player.STATE_BUFFERING ||
                                        c.playbackState == Player.STATE_READY)
                )
                invoke.resolve(r)
            }

    @Command
    fun peekHistory(invoke: Invoke) {
        val r = JSObject()
        r.put("items", Store.peek(activity))
        invoke.resolve(r)
    }

    @Command
    fun ackHistory(invoke: Invoke) {
        val a = invoke.parseArgs(AckArgs::class.java)
        Store.ack(activity, a.upTo)
        invoke.resolve()
    }
}
