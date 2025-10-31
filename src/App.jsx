import { use, useCallback, useEffect, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import "./App.css";
import { handleAudioError } from "./utils/utilities.js";
import AudioVisualizer from "./components/AudioVisualizer";
import SpeechControl from "./components/SpeechControl";
import ErrorBox from "./components/ErrorBox";
import SpeakerModelBox from "./components/SpeakerModelBox";
import {easeInOut, motion} from "framer-motion"
import { speakerMap } from "./states/states.jsx";

export default function MoC() {
  const vadRef = useRef(null);
  const websocketRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  const audioPlayingRef = useRef(false);
  const callAudioEndedRef = useRef(false);
  const isStartingStream = useRef(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState("Ken");

  const [openSpeakerBox, setOpenSpeakerBox] = useState(false);
  const sourceBufferRef = useRef(null);
  const [webSocket, setWebSocket] = useState(null);
  const [notification, setNotification] = useState(" ");
  const [showWaveform, setShowWaveform] = useState(false);
  const [script, setScript] = useState(null);
  const [showCeremonyTable, setShowCeremonyTable] = useState(false);
  const [ceremonyData, setCeremonyData] = useState(null);
  const [showSpeechControl, setShowSpeechControl] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState(null);
  const [currentSpeakerDetails, setCurrentSpeakerDetails] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorBox, setShowErrorBox] = useState(true);
  const [ceremonyStarted, setCeremonyStarted] = useState(false);

  const safeEndOfStream = () => {
    const ms = mediaSourceRef.current;
    const sb = sourceBufferRef.current;
    if (!ms || ms.readyState !== "open") return;

    const tryEnd = () => {
      if (sb && sb.updating) {
        sb.addEventListener("updateend", tryEnd, { once: true });
        return;
      }
      if (ms.readyState === "open") {
        try {
          ms.endOfStream();
          console.log("Stream ended safely!");

          const audio_duration = audioRef.current.duration;
          console.log("Audio duration is", audio_duration);
          const interval = audio_duration * 1000;
          console.log("Audio interval", interval);

          if (audio_duration && isFinite(audio_duration)) {
            clearTimeout(playbackIntervalRef.current);
            // playbackIntervalRef.current = setTimeout(() => {
            //   console.log("Audio duration interval in action");
            //   if (callAudioEndedRef.current) {
            //     console.log("Audio ended already called, clearing interval");
            //     callAudioEndedRef.current = false;
            //   } else {
            //     console.log(
            //       "Onended didn't fire so handling audio end manually!"
            //     );
            //     handleAudioEnd();
            //     setScript(null);
            //     callAudioEndedRef.current = true;
            //   }
            //   console.log("Timeout cleared!");
            // }, interval);
          }
        } catch (e) {
          console.warn("endOfStream failed:", e);
        }
      }
    };
    tryEnd();
  };

  const queue = [];

  const startNewStream = () => {
    if (isStartingStream.current) return;
    isStartingStream.current = true;

    if (audioRef.current.src) {
      const oldSrc = audioRef.current.src;
      audioRef.current.onended = () => {
        console.log("Old src ended, revoking...");
        URL.revokeObjectURL(oldSrc);
      };
    }
    console.log("making new sourceBuffer");

    const audio = audioRef.current;

    callAudioEndedRef.current = false;
    clearTimeout(playbackIntervalRef.current);
    console.log(
      "🔄 Reset callAudioEndedRef and cleared timeout for new playback"
    );

    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    audio.src = URL.createObjectURL(mediaSource);
    console.log("New audio src made!");
    audio.onended = null;
    audio.onended = () => {
      // only call if not called previously
      if (!callAudioEndedRef.current) {
        console.log("audio.onended fired!");
        handleAudioEnd();
        setScript(null);
        callAudioEndedRef.current = true;
      } else {
        callAudioEndedRef.current = false;
      }
    };

    audioPlayingRef.current = false;

    mediaSourceRef.current.addEventListener(
      "sourceopen",
      () => {
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        sourceBufferRef.current = sourceBuffer;
        isStartingStream.current = false;
        if (queue.length > 0 && !sourceBuffer.updating) {
          const nextChunk = queue.shift();
          sourceBuffer.appendBuffer(nextChunk);
        }

        sourceBuffer.addEventListener("updateend", () => {
          if (queue.length > 0 && !sourceBuffer.updating) {
            const nextChunk = queue.shift();
            sourceBuffer.appendBuffer(nextChunk);
          }
        });
      },
      { once: true }
    );
  };

  const feedChunk = (bytes) => {
    queue.push(bytes);

    const sb = sourceBufferRef.current;
    if (!sb) {
      startNewStream();
      return;
    }

    if (!sb.updating) {
      const nextChunk = queue.shift();
      sb.appendBuffer(nextChunk);
    }
  };

  const handleAudioEnd = () => {
    console.log("Frontend audio finished playback, sending flag to server!");
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current?.send(JSON.stringify({ audioFinished: true }));
    }
    setShowWaveform(false);
    sourceBufferRef.current = null;
    mediaSourceRef.current = null;
  };

  useEffect(() => {
    audioContextRef.current = new window.AudioContext();
    sourceRef.current = audioContextRef.current.createMediaElementSource(
      audioRef.current
    );
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.crossOrigin = "anonymous";

    const handleCanPlay = () => {
      console.log("Enough data loaded to play audio!");
      setShowWaveform(true);

      audio.onplay = () => {
        audioPlayingRef.current = true;
      };

      audioRef.current
        .play()
        .then(() => {
          console.log("Playback started");
        })
        .catch((err) => console.warn("Autoplay blocked:", err));
    };

    // Attach the canplay event
    audio.addEventListener("canplay", handleCanPlay);

    // Error handling
    const handleAudioError = (event) => {
      console.error("Audio error occurred:", event);
    };
    audio.addEventListener("error", handleAudioError);

    // ---- WEBSOCKET SETUP ----
    const websocket = new WebSocket(`${import.meta.env.VITE_BACKEND_URL}`);
    websocketRef.current = websocket;
    setWebSocket(websocket);

    websocket.onopen = () => console.log("✅ WebSocket connected");
    websocket.onerror = (error) => console.error("WebSocket error:", error);
    websocket.onclose = (event) => console.warn("❌ WebSocket closed:", event);

    websocket.onmessage = async (event) => {
      const response_data = JSON.parse(event.data);
      console.log("Data from backend:", response_data);

      switch (response_data.type) {
        case "current_state":
          setNotification(response_data.message);
          if (response_data.phase === "listen") setShowSpeechControl(true);
          else if (response_data.phase === "remarks") {
            setShowSpeechControl(false);
            setLiveTranscription(null);
            setCurrentSpeakerDetails(null);
          }
          break;

        case "script":
          const script = response_data.content;
          setScript(script);
          break;
        case "audio_chunk": {
          const base64data = response_data.audio_chunk;
          const binaryString = atob(base64data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          feedChunk(bytes);
          break;
        }

        case "audioFinished":
          console.log("Audio streaming finished");

          safeEndOfStream();
          break;

        case "ceremony_data":
          setCeremonyData(response_data);
          setShowCeremonyTable(true);
          break;

        case "speaker_details":
          setCurrentSpeakerDetails(response_data);
          break;

        case "transcription":
          setLiveTranscription(response_data.transcription);
          break;

        case "error":
          setErrorDetails(response_data);
          setShowErrorBox(true);
          break;
      }
    };

    // ✅ Proper cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onplay = null;
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
      }
      audio.removeEventListener("error", handleAudioError);

      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, []);
  const vad = useMicVAD({
    startOnLoad: false,

    onSpeechStart: () => {
      console.log("Speech started");
    },
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.27/dist/",
    onFrameProcessed: ({ isSpeech, notSpeech }, frame) => {
      if (vad.userSpeaking) {
        // convert to pcm 16 audio chunks
        const pcm16chunk = float32ToPCM16(frame);
        if (pcm16chunk) {
          try {
            websocketRef.current.send(pcm16chunk);
          } catch (error) {
            console.error(
              "Some error occured while sending audio via websocket: ",
              error
            );
          }
        }
      }
    },
  });
  vadRef.current = vad;

  // Convert float32 array to PCM 16-bit little-endian
  const float32ToPCM16 = (float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = sample * 0x7fff;
    }
    return pcm16.buffer; // Return as ArrayBuffer for WebSocket
  };

  const initiateCeremony = () => {
    const data = {
      phase: "initiate",
      speaker: speakerMap[selectedSpeaker],
    };
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current?.send(JSON.stringify(data));
      setCeremonyStarted(true);
    }
  };
  return (
    <div className="flex flex-col w-screen min-h-screen h-max items-center gap-y-2 py-3">
      <div
        className={`flex p-4 justify-around ${
          openSpeakerBox ? "" : "items-center"
        } w-full`}
      >
        <div className="title-box flex flex-col gap-y-2">
          <p className="font-medium text-2xl">Master of Ceremony</p>
          {!ceremonyStarted ? (
            <button
              disabled={webSocket?.readyState !== 1}
              onClick={initiateCeremony}
              className={`px-3 py-2 text-white bg-blue-400 rounded-lg hover:bg-blue-500 ${
                webSocket?.readyState === 1
                  ? "cursor-pointer"
                  : "cursor-not-allowed"
              }`}
            >
              Start ceremony
            </button>
          ) : null}
        </div>
        <div className="relative flex flex-col gap-y-2">
          <div className={`${ceremonyStarted ? "hidden" : ""}`}>
            <div className="label text-xs absolute left-1 -top-2.5 px-2 tracking-tight bg-white">
              Speaker
            </div>
            <div
              onClick={() => {
                setOpenSpeakerBox((prev) => !prev);
              }}
              className={`select-box`}
            >
              <div className="flex w-48 h-8 items-center rounded-lg border border-black/20 px-2 cursor-pointer">
                <p>{selectedSpeaker}</p>
                <span className="ml-auto text-black material-symbols-outlined">
                  arrow_drop_down
                </span>
              </div>
            </div>
          </div>
          <motion.div
          initial={{opacity:0}}
          animate={{opacity:1}}
          transition={{duration:0.25, ease:easeInOut}}
            className={`${
              openSpeakerBox ? "" : "hidden"
            }  options-box w-48 z-20 rounded-lg relative overflow-x-clip`}
          >
            <Options
              optionsList={[
                "Ken",
                "Natalie",
                "Charles",
                "Hazel",
                "Ruby",
                "Terell",
                "Miles",
                "Jim",
                "Freddie",
                "Riley",
                "Wayne",
              ]}
              setSelectedSpeaker={setSelectedSpeaker}
              setOpenSpeakerBox={setOpenSpeakerBox}
            />
          </motion.div>
        </div>
        {/* <div className="websocket-status-box w-max h-max p-4 border border-black/20 flex flex-col">
          <p className="text-lg">
            <strong>WebSocket connection details</strong>
          </p>
          <p>
            <strong>Socket status: </strong>
            {webSocket?.readyState === 1 ? "initialized" : "uninitialized"}
          </p>
          <p>
            <strong>Microphone recording: </strong>
            {vadRef.current?.listening === true ? "yes" : "no"}
          </p>
          <p>
            <strong>Websocket URL: </strong>
            {websocketRef.current?.url ? websocketRef.current.url : "undefined"}
          </p>
        </div> */}
      </div>

      {/* show the speech control button */}

      {showSpeechControl ? (
        <SpeechControl
          vadRef={vadRef.current}
          websocketRef={websocketRef.current}
          setNotification={setNotification}
          setShowSpeechControl={setShowSpeechControl}
        />
      ) : null}

      <p className="font-medium text-xl">{notification}</p>
      {/* {showWaveform ? ( */}
        <AudioVisualizer
          sourceRef={sourceRef}
          audioContextRef={audioContextRef}
        />
      {/* ) : null} */}
      <div className="flex gap-x-4 mt-4">
        {currentSpeakerDetails || liveTranscription ? (
          <SpeakerModelBox
            speaker_details={currentSpeakerDetails}
            live_transcription={liveTranscription}
          />
        ) : null}
        {script && (
          <div className="h-max p-3 border border-black/10">
            <strong>Tayyib</strong>
            <p>{script}</p>
          </div>
        )}
      </div>

      {showErrorBox ? (
        <ErrorBox
          error_details={errorDetails}
          setShowErrorBox={setShowErrorBox}
        />
      ) : null}

      {/* {showCeremonyTable ? (
        <CeremonyTable ceremony_data={ceremonyData} />
      ) : null} */}

      <audio className="hidden" ref={audioRef} controls></audio>
    </div>
  );
}

// audioRef.current.addEventListener("canplay", () => {
//   console.log("Enough data loaded to play audio!");
//   setShowWaveform(true);
//   audioRef.current
//     .play()
//     .then(() => {
//       const timeInterval = setInterval(() => {
//         console.log("Time interval started");
//         if (!audioRef.current.paused && !audioRef.current.ended) {
//           console.log("Audio is still playing!");
//           return;
//         } else {
//           console.log("Ending audio!");
//           handleAudioEnd();
//           clearInterval(timeInterval);
//         }
//       }, 500);
//     })
//     .catch((err) => {
//       console.warn("Autoplay blocked:", err);
//     });
// });

const Options = ({ setSelectedSpeaker, optionsList, setOpenSpeakerBox }) => {
  const boxRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpenSpeakerBox(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setOpenSpeakerBox]);
  return (
    <div className="absolute bg-white w-full border border-black/10 rounded-md" ref={boxRef}>
      {optionsList?.map((option, index) => (
        <div
          onClick={(e) => {
            setSelectedSpeaker(option);
            setOpenSpeakerBox(false);
          }}
          key={index}
          className="flex option cursor-pointer py-1 px-2 hover:bg-black/10"
        >
          <p className="text-sm">{option}</p>
          <span className="ml-auto material-symbols-outlined">language_us</span>
        </div>
      ))}
    </div>
  );
};
