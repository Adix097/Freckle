package com.plugin.player

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import java.io.IOException

class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private val handler = Handler(Looper.getMainLooper())
    private var lastId = ""
    private var lastAt = 0L

    private val ticker =
            object : Runnable {
                override fun run() {
                    session?.player?.let {
                        if (it.isPlaying) Store.saveQueue(this@PlaybackService, it)
                    }
                    handler.postDelayed(this, 5000)
                }
            }

    private fun log(item: MediaItem) {
        val now = System.currentTimeMillis()
        if (item.mediaId == lastId && now - lastAt < 3000) return
        lastId = item.mediaId
        lastAt = now
        Store.logStart(this, item)
    }

    override fun onCreate() {
        super.onCreate()
        val http =
                DefaultHttpDataSource.Factory()
                        .setUserAgent(UA)
                        .setAllowCrossProtocolRedirects(true)
        val resolver =
                object : ResolvingDataSource.Resolver {
                    override fun resolveDataSpec(dataSpec: DataSpec): DataSpec {
                        if (dataSpec.uri.scheme != "freckle") return dataSpec
                        val id = dataSpec.uri.lastPathSegment ?: throw IOException("Bad track id")
                        try {
                            return dataSpec.withUri(Uri.parse(Streams.url(id)))
                        } catch (e: Exception) {
                            throw IOException(e.message ?: e.toString(), e)
                        }
                    }
                }
        val player =
                ExoPlayer.Builder(this)
                        .setMediaSourceFactory(
                                DefaultMediaSourceFactory(this)
                                        .setDataSourceFactory(
                                                ResolvingDataSource.Factory(http, resolver)
                                        )
                        )
                        .setAudioAttributes(
                                AudioAttributes.Builder()
                                        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                                        .setUsage(C.USAGE_MEDIA)
                                        .build(),
                                true
                        )
                        .setHandleAudioBecomingNoisy(true)
                        .setWakeMode(C.WAKE_MODE_NETWORK)
                        .build()
        player.addListener(
                object : Player.Listener {
                    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                        if (mediaItem != null && player.playWhenReady) log(mediaItem)
                        Store.saveQueue(this@PlaybackService, player)
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        if (isPlaying) player.currentMediaItem?.let { log(it) }
                        Store.saveQueue(this@PlaybackService, player)
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        if (player.hasNextMediaItem()) {
                            player.seekToNextMediaItem()
                            player.prepare()
                            player.play()
                        }
                    }
                }
        )
        session = MediaSession.Builder(this, player).build()
        handler.postDelayed(ticker, 5000)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onTaskRemoved(rootIntent: Intent?) {
        session?.player?.let { Store.saveQueue(this, it) }
        pauseAllPlayersAndStopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacks(ticker)
        session?.run {
            player.release()
            release()
        }
        session = null
        super.onDestroy()
    }
}
