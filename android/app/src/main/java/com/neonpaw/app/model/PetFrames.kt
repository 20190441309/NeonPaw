package com.neonpaw.app.model

/**
 * ASCII scene frames — ported from frontend petFrames.ts / iOS PetFrames.
 * Each frame is a full cyber-terminal scene, not just a pet avatar.
 */
object PetFrames {

    enum class FrameKey {
        BOOTING, SLEEPING, AWAKE, LISTENING, THINKING,
        SPEAKING, HAPPY, COMFORTING, GLITCH, ERROR;

        val key: String get() = name.lowercase()
    }

    private val actionToFrame: Map<PetAction, FrameKey> = mapOf(
        PetAction.WAKE to FrameKey.AWAKE,
        PetAction.SLEEP to FrameKey.SLEEPING,
        PetAction.LISTEN to FrameKey.LISTENING,
        PetAction.THINK to FrameKey.THINKING,
        PetAction.SPEAK to FrameKey.SPEAKING,
        PetAction.HAPPY to FrameKey.HAPPY,
        PetAction.COMFORT to FrameKey.COMFORTING,
        PetAction.GLITCH to FrameKey.GLITCH,
        PetAction.ERROR to FrameKey.ERROR,
    )

    private val sceneFrames: Map<FrameKey, String> = mapOf(
        FrameKey.BOOTING to """
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // TERMINAL PET OS                       BOOTING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │  initializing cyber companion core...  │          │
│        │                                        │          │
│        │  pet_core.sys        [████████░░░░]    │          │
│        │  voice_link.mod      [██████░░░░░░]    │          │
│        │  memory_seed.db      [█████░░░░░░░]    │          │
│        │  emotion_bus         [███░░░░░░░░░]    │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│                  SYSTEM SIGNAL: ▂▃▅▆▇▆▅▃▂                 │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.SLEEPING to """
╭────────────────────────────────────────────────────────────╮
│  PET CAPSULE // SLEEP MODE                         IDLE   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              z       z        z                            │
│        ╭────────────────────────────────────────╮          │
│        │                                        │          │
│        │              /\_/\                     │          │
│        │             ( -.- )    low power       │          │
│        │             /  ^  \                    │          │
│        │          ─────────────                 │          │
│        │        capsule temperature: stable     │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        TAP SCREEN TO WAKE  │  DREAM CACHE: ACTIVE          │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.AWAKE to """
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // ONLINE                               AWAKE   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( o.o )                    │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      signal locked: user nearby        │          │
│        │      companion core: responsive        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        STATUS: STABLE  │  MOOD: CALM  │  LINK: READY       │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.LISTENING to """
╭────────────────────────────────────────────────────────────╮
│  VOICE LINK // ACTIVE                          LISTENING  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\         )))         │          │
│        │             ( o.o )                    │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      microphone stream detected        │          │
│        │      input wave: ▂▃▅▇▆▅▃▂▃▅▆▇▅        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SAY SOMETHING  │  STT BUFFER: RECORDING             │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.THINKING to """
╭────────────────────────────────────────────────────────────╮
│  PET BRAIN // ROOT AGENT                         THINKING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( o_o )     ?              │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │   root_agent     → parsing intent      │          │
│        │   state_core     → mood delta          │          │
│        │   action_bus     → frame select        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        INTERNAL TRACE:  [ intent ][ emotion ][ action ]    │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.SPEAKING to """
╭────────────────────────────────────────────────────────────╮
│  SYNTH VOICE // OUTPUT                           SPEAKING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( o.o )  )))               │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      audio out: ▂▂▃▅▇▅▃▂▂             │          │
│        │      tone profile: soft_robotic        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        NEON PAW IS TALKING  │  TTS STREAM: ACTIVE          │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.HAPPY to """
╭────────────────────────────────────────────────────────────╮
│  EMOTION CORE // POSITIVE                         HAPPY   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\           ✦         │          │
│        │             ( ^.^ )     ✦              │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      mood       + + +                  │          │
│        │      affinity   + +                    │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SIGNAL GLOW: ACTIVE  │  COMPANION LINK: WARM        │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.COMFORTING to """
╭────────────────────────────────────────────────────────────╮
│  COMPANION MODE // SOFT SIGNAL                   COMFORT  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( ._. )       ♡            │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      response mode: gentle             │          │
│        │      stay with user: true              │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SOFT TONE ENABLED  │  PRESSURE LEVEL: REDUCING      │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.GLITCH to """
╭────────────────────────────────────────────────────────────╮
│  SIGNAL ERROR // GLITCH                         UNSTABLE  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭──────────────#─────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( x_x )       !!           │          │
│        │             /  #  \                    │          │
│        │                                        │          │
│        │      c0re_s1gnal: unstable             │          │
│        │      attempting self repair...         │          │
│        ╰────────────────────────#───────────────╯          │
│                                                            │
│        ERROR TRACE: 0xPAW-404  │  RECOVERY: RETRY          │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
        FrameKey.ERROR to """
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // CORE ERROR                            ERROR   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\                     │          │
│        │             ( x.x )                    │          │
│        │             /  !  \                    │          │
│        │                                        │          │
│        │      core engine offline               │          │
│        │      hint: retry voice input           │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        FALLBACK RESPONSE READY  │  SAFE MODE: ENABLED      │
╰────────────────────────────────────────────────────────────╯
""".trimIndent(),
    )

    /** Priority: action > emotion > mode */
    fun selectFrame(mode: PetMode, emotion: PetEmotion, action: PetAction?): String {
        action?.let { act ->
            actionToFrame[act]?.let { key ->
                sceneFrames[key]?.let { return it }
            }
        }
        emotionFrame(emotion)?.let { return it }
        modeFrame(mode)?.let { return it }
        return sceneFrames.getValue(FrameKey.SLEEPING)
    }

    private fun emotionFrame(emotion: PetEmotion): String? {
        val key = when (emotion) {
            PetEmotion.HAPPY -> FrameKey.HAPPY
            PetEmotion.COMFORTING -> FrameKey.COMFORTING
            PetEmotion.GLITCH -> FrameKey.GLITCH
            PetEmotion.SLEEPY -> FrameKey.SLEEPING
            else -> null
        }
        return key?.let { sceneFrames[it] }
    }

    private fun modeFrame(mode: PetMode): String? {
        val key = when (mode) {
            PetMode.BOOTING -> FrameKey.BOOTING
            PetMode.SLEEPING -> FrameKey.SLEEPING
            PetMode.AWAKE -> FrameKey.AWAKE
            PetMode.LISTENING -> FrameKey.LISTENING
            PetMode.THINKING -> FrameKey.THINKING
            PetMode.SPEAKING -> FrameKey.SPEAKING
            PetMode.ERROR -> FrameKey.ERROR
        }
        return sceneFrames[key]
    }
}
