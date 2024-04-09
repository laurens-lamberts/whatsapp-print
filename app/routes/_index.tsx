import type { MetaFunction } from "@remix-run/node";
import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const MESSAGE_RENDER_INTERVAL = 3;
const MESSAGE_RENDER_LIMIT = 30;

interface ChatMessage {
  datetime?: Date;
  sender: string;
  message?: string;
  color: string;
  attachmentName?: string;
}

export default function Index() {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [consecutiveMessages, setConsecutiveMessages] = useState<ChatMessage[]>(
    []
  );
  const [attachments, setAttachments] = useState<File[]>([]);

  const parseDate = (datetimeFromText: string) => {
    const [date, time] = datetimeFromText.replace("[", "").split(", ");
    const [day, month, year] = date.split("/");
    const [hours, minutes, seconds] = time.split(":");

    return new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-indexed in JavaScript
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  };

  const parseFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files === null) return;

    const newAttachments: File[] = [];

    let chatFile: File | undefined = undefined;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (file.name === "_chat.txt") {
        // This will be processed later
        chatFile = file;
      } else {
        newAttachments.push(file);
      }
    }
    setAttachments(newAttachments);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e?.target?.result as string;

      const lines = text
        .split("\n")
        .filter((line) => line.includes("] ")) // filter out lines without "] "
        .map((line) => line.replace(/\u200e/g, ""));

      console.log("lines", lines);

      let previousLine = "";
      const chatMessages = lines.reduce((acc, line) => {
        const datetimePattern = /^\[\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}\]/;
        if (!datetimePattern.test(line)) {
          previousLine += " " + line;
          return acc;
        }

        if (previousLine) {
          acc.push(previousLine);
          previousLine = "";
        }

        previousLine = line;
        return acc;
      }, []);

      if (previousLine) {
        chatMessages.push(previousLine);
      }

      setChat(
        chatMessages.map((line) => {
          const [datetimeUntrimmed, senderMessage] = line.split("] ");
          let attachmentName: string | undefined = undefined;

          // Check if the message is defined and contains an attachment
          if (line.includes("<attached:")) {
            console.log(
              "there seems to be an attachment... <-- probably incorrect!"
            );
            const filename = line.split("<attached: ")[1].replace(">", "");
            attachmentName = filename;
          }

          const [sender, message] = senderMessage.split(": ");
          const datetime = datetimeUntrimmed.replace("[", "");

          let parsedDate: Date | undefined = undefined;

          if (datetime) {
            try {
              parsedDate = parseDate(datetime);
            } catch (e) {
              console.error(e, line);
            }
          }

          return {
            datetime: parsedDate,
            sender,
            message: attachmentName ? "" : message,
            color:
              sender === "Marit"
                ? "#666"
                : sender === "Laurens"
                ? "green"
                : "black",
            attachmentName,
          };
        })
      );
    };
    if (chatFile) {
      reader.readAsText(chatFile);
    } else {
      alert("No chat file found");
    }
  };

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const consecutivelyRenderMessages = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      // console.log(
      //   "Chat length:",
      //   chat.length,
      //   "Consecutive messages:",
      //   consecutiveMessages.length
      // );

      setConsecutiveMessages((prevMessages) => {
        if (prevMessages.length === chat.length) return prevMessages;
        console.log("Rendering message", prevMessages.length);

        return [...prevMessages, chat[prevMessages.length]];
      });
    }, MESSAGE_RENDER_INTERVAL);
  }, [chat]);

  useEffect(() => {
    if (chat.length > 0) {
      consecutivelyRenderMessages();
    }
  }, [chat, consecutivelyRenderMessages]);
  useEffect(() => {
    if (!chat.length) return;
    if (consecutiveMessages.length >= MESSAGE_RENDER_LIMIT) {
      clearInterval(intervalRef.current);
      console.log("Done rendering messages - reached limit");
    }
    if (consecutiveMessages.length === chat.length) {
      clearInterval(intervalRef.current);
      console.log("Done rendering messages - reached end of chat");
    }
  }, [consecutiveMessages.length, chat.length]);

  /* useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreMessages();
      }
    });

    if (lastMessageRef.current) {
      observer.current.observe(lastMessageRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [consecutiveMessages, chat]); */

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
      }}
    >
      <h1 style={{ color: "white" }}>Whatsapp export printer</h1>
      {/* <input type="file" onChange={(e) => showFile(e)} /> */}
      <input
        directory=""
        webkitdirectory=""
        type="file"
        onChange={(e) => parseFolder(e)}
      />
      <div style={{ flex: 1, gap: 8 }}>
        {consecutiveMessages.map((message, i) => (
          <div key={i}>
            {/* If this is the first message of the day, add a day tag */}
            {i === 0 ||
            message.datetime.getDate() !== chat[i - 1].datetime.getDate() ? (
              <h3 style={{ color: "white" }}>
                {message.datetime.toLocaleDateString("nl-NL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
            ) : null}

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent:
                  message.sender === "Marit" ? "flex-start" : "flex-end",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: message.color,
                  maxWidth: "80%",
                  color: "white",
                  paddingBlock: 4,
                  paddingInline: 8,
                  borderRadius: 8,
                  marginTop:
                    i === 0 || message.sender !== chat[i - 1].sender ? 12 : 4,
                }}
              >
                {message.message}
                {message.attachmentName ? (
                  <a
                    // href={URL.createObjectURL(
                    //   attachments.find(
                    //     (attachment) =>
                    //       attachment.name === message.attachmentName
                    //   )!
                    // )}
                    download={message.attachmentName}
                    style={{ color: "white" }}
                  >
                    {message.attachmentName}
                    {/* <img
                      src={URL.createObjectURL(
                        attachments.find(
                          (attachment) =>
                            attachment.name === message.attachmentName
                        )!
                      )}
                      alt={"TODO: add alt text"}
                      style={{ maxWidth: "40%" }}
                    /> */}
                  </a>
                ) : null}
                {/* Time */}
                <div style={{ fontSize: "0.8em", textAlign: "right" }}>
                  {message.datetime.toLocaleTimeString("nl-NL", {
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
        {attachments.map((file, i) => (
          <div key={i} style={{ flexDirection: "column" }}>
            <a href={URL.createObjectURL(file)} download={file.name}>
              {file.name}
            </a>
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              style={{ maxWidth: "40%" }}
            />
          </div>
        ))}
      </div> */}
    </div>
  );
}
