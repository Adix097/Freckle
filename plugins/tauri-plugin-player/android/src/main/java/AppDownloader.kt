package com.plugin.player

import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import java.net.HttpURLConnection
import java.net.URL

const val UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"

class AppDownloader : Downloader() {
    override fun execute(request: Request): Response {
        val conn = URL(request.url()).openConnection() as HttpURLConnection
        conn.requestMethod = request.httpMethod()
        conn.connectTimeout = 15000
        conn.readTimeout = 25000
        conn.instanceFollowRedirects = true
        conn.setRequestProperty("User-Agent", UA)
        request.headers().forEach { (k, vs) ->
            if (!k.equals("Accept-Encoding", true)) conn.setRequestProperty(k, vs.joinToString(","))
        }
        request.dataToSend()?.let {
            conn.doOutput = true
            conn.outputStream.use { os -> os.write(it) }
        }
        val code = conn.responseCode
        if (code == 429) {
            conn.disconnect()
            throw ReCaptchaException("reCaptcha Challenge requested", request.url())
        }
        val stream = if (code >= 400) conn.errorStream else conn.inputStream
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
        val headers = conn.headerFields.filterKeys { it != null }.mapKeys { it.key!! }
        return Response(code, conn.responseMessage ?: "", headers, body, conn.url.toString())
    }
}