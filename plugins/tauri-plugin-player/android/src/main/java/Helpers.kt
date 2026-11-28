package com.plugin.player

import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import java.util.concurrent.ConcurrentHashMap
import org.json.JSONArray
import org.json.JSONObject
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.stream.StreamInfo

object Streams {
    private class Entry(val url: String, val at: Long)

    private val cache = ConcurrentHashMap<String, Entry>()
    private var ready = false

    @Synchronized
    private fun init() {
        if (!ready) {
            NewPipe.init(AppDownloader(), Localization("en", "US"))
            ready = true
        }
    }

    fun url(id: String): String {
        val hit = cache[id]
        if (hit != null && System.currentTimeMillis() - hit.at < 90 * 60_000) return hit.url
        init()
        var last: Exception? = null
        repeat(2) {
            try {
                val info =
                        StreamInfo.getInfo(
                                ServiceList.YouTube,
                                "https://www.youtube.com/watch?v=$id"
                        )
                val best =
                        info.audioStreams
                                .filter {
                                    it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP &&
                                            !it.content.isNullOrEmpty()
                                }
                                .maxByOrNull { it.averageBitrate }
                                ?: throw Exception("No audio stream found")
                cache[id] = Entry(best.content, System.currentTimeMillis())
                return best.content
            } catch (e: Exception) {
                last = e
            }
        }
        throw last ?: Exception("Could not resolve stream")
    }
}

private fun JSONObject.str(k: String): String? =
        if (isNull(k)) null else optString(k).takeIf { it.isNotEmpty() }

object Store {
    private fun p(c: Context) = c.getSharedPreferences("freckle_player", Context.MODE_PRIVATE)

    fun itemJson(m: MediaItem): JSONObject =
            JSONObject().apply {
                put("id", m.mediaId)
                put("title", m.mediaMetadata.title?.toString() ?: "")
                put("artist", m.mediaMetadata.artist?.toString() ?: "")
                put("album", m.mediaMetadata.albumTitle?.toString() ?: JSONObject.NULL)
                val d = m.mediaMetadata.extras?.getInt("dur", 0) ?: 0
                put("duration", if (d > 0) d else JSONObject.NULL)
                put("cover", m.mediaMetadata.artworkUri?.toString() ?: JSONObject.NULL)
            }

    fun toItem(o: JSONObject): MediaItem {
        val id = o.getString("id")
        val extras =
                Bundle().apply {
                    putInt("dur", if (o.isNull("duration")) 0 else o.optInt("duration", 0))
                }
        val meta =
                MediaMetadata.Builder()
                        .setTitle(o.str("title") ?: "")
                        .setArtist(o.str("artist") ?: "")
                        .setAlbumTitle(o.str("album"))
                        .setExtras(extras)
                        .apply { o.str("cover")?.let { setArtworkUri(Uri.parse(it)) } }
                        .build()
        return MediaItem.Builder()
                .setMediaId(id)
                .setUri("freckle://s/$id")
                .setMediaMetadata(meta)
                .build()
    }

    fun itemsJson(player: Player): String {
        val arr = JSONArray()
        for (i in 0 until player.mediaItemCount) arr.put(itemJson(player.getMediaItemAt(i)))
        return arr.toString()
    }

    @Synchronized
    fun saveQueue(c: Context, player: Player) {
        val e = p(c).edit()
        if (player.mediaItemCount == 0) {
            e.remove("queue")
        } else {
            val o = JSONObject()
            o.put("items", JSONArray(itemsJson(player)))
            o.put("index", player.currentMediaItemIndex)
            o.put("position", player.currentPosition)
            e.putString("queue", o.toString())
        }
        e.apply()
    }

    @Synchronized
    fun saved(c: Context): JSONObject? =
            p(c).getString("queue", null)?.let {
                try {
                    JSONObject(it)
                } catch (e: Exception) {
                    null
                }
            }

    @Synchronized
    fun clearAll(c: Context) {
        p(c).edit().remove("queue").remove("log").apply()
    }

    @Synchronized
    fun logStart(c: Context, item: MediaItem) {
        val old = JSONArray(p(c).getString("log", "[]"))
        val o = itemJson(item)
        o.put("t", System.currentTimeMillis())
        val out = JSONArray()
        for (i in maxOf(0, old.length() - 299) until old.length()) out.put(old.get(i))
        out.put(o)
        p(c).edit().putString("log", out.toString()).apply()
    }

    @Synchronized fun peek(c: Context): String = p(c).getString("log", "[]") ?: "[]"

    @Synchronized
    fun ack(c: Context, upTo: Long) {
        val old = JSONArray(peek(c))
        val out = JSONArray()
        for (i in 0 until old.length()) {
            val o = old.getJSONObject(i)
            if (o.optLong("t") > upTo) out.put(o)
        }
        p(c).edit().putString("log", out.toString()).apply()
    }
}
