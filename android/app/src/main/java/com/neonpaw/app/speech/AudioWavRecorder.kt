package com.neonpaw.app.speech

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Records mono 16-bit PCM and packages it as a WAV byte array.
 * Sample rate 16 kHz — good default for FunASR / Chinese ASR.
 */
class AudioWavRecorder(
    private val sampleRate: Int = 16_000,
) {
    private var audioRecord: AudioRecord? = null
    private var recordThread: Thread? = null
    private val recording = AtomicBoolean(false)
    private val pcmBuffer = ByteArrayOutputStream()

    val isRecording: Boolean get() = recording.get()

    @SuppressLint("MissingPermission")
    fun start() {
        if (recording.get()) return

        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBuf = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        val bufferSize = maxOf(minBuf, sampleRate) // ~0.5s+ buffer

        val recorder = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize,
        )
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            throw IllegalStateException("AudioRecord init failed")
        }

        synchronized(pcmBuffer) {
            pcmBuffer.reset()
        }
        audioRecord = recorder
        recording.set(true)
        recorder.startRecording()

        recordThread = Thread({
            val chunk = ByteArray(bufferSize)
            while (recording.get()) {
                val read = recorder.read(chunk, 0, chunk.size)
                if (read > 0) {
                    synchronized(pcmBuffer) {
                        pcmBuffer.write(chunk, 0, read)
                    }
                }
            }
        }, "neon-paw-wav-recorder").also {
            it.isDaemon = true
            it.start()
        }
    }

    /** Stop recording and return a complete WAV file as bytes. */
    fun stop(): ByteArray {
        recording.set(false)
        try {
            recordThread?.join(1500)
        } catch (_: InterruptedException) {
        }
        recordThread = null

        try {
            audioRecord?.stop()
        } catch (_: Exception) {
        }
        try {
            audioRecord?.release()
        } catch (_: Exception) {
        }
        audioRecord = null

        val pcm = synchronized(pcmBuffer) {
            pcmBuffer.toByteArray()
        }
        return wrapWav(pcm, sampleRate, channels = 1, bitsPerSample = 16)
    }

    fun cancel() {
        recording.set(false)
        try {
            recordThread?.join(500)
        } catch (_: InterruptedException) {
        }
        recordThread = null
        try {
            audioRecord?.stop()
        } catch (_: Exception) {
        }
        try {
            audioRecord?.release()
        } catch (_: Exception) {
        }
        audioRecord = null
        synchronized(pcmBuffer) {
            pcmBuffer.reset()
        }
    }

    companion object {
        fun wrapWav(
            pcm: ByteArray,
            sampleRate: Int,
            channels: Int,
            bitsPerSample: Int,
        ): ByteArray {
            val byteRate = sampleRate * channels * bitsPerSample / 8
            val blockAlign = (channels * bitsPerSample / 8).toShort()
            val dataSize = pcm.size
            val totalDataLen = dataSize + 36

            val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
            header.put("RIFF".toByteArray(Charsets.US_ASCII))
            header.putInt(totalDataLen)
            header.put("WAVE".toByteArray(Charsets.US_ASCII))
            header.put("fmt ".toByteArray(Charsets.US_ASCII))
            header.putInt(16) // PCM chunk size
            header.putShort(1) // audio format PCM
            header.putShort(channels.toShort())
            header.putInt(sampleRate)
            header.putInt(byteRate)
            header.putShort(blockAlign)
            header.putShort(bitsPerSample.toShort())
            header.put("data".toByteArray(Charsets.US_ASCII))
            header.putInt(dataSize)

            return header.array() + pcm
        }
    }
}
