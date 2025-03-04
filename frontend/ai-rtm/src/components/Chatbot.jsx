// import { useState } from "react";
// import { Paperclip, Send, X, FileText, File } from "lucide-react";
// import "./Chatbot.css";

// export default function Chatbot() {
//   const [messages, setMessages] = useState([
//     { sender: "bot", text: "Hi, Welcome to Edify Career Chatbot!" },
//     {
//       sender: "bot",
//       text: "Please upload your resume to find your best-matched role.",
//     },
//   ]);
//   const [file, setFile] = useState("");
//   const [userText, setuserText] = useState("");
//   const [fileInputKey, setFileInputKey] = useState(Date.now());

//   const getFileType = (fileName) => {
//     const extension = fileName.split(".").pop().toLowerCase();
//     if (extension === "pdf") return "pdf";
//     if (["doc", "docx"].includes(extension)) return "doc";
//     return "unknown";
//   };

//   const handleFileChange = (event) => {
//     const selectedFile = event.target.files[0];
//     if (!selectedFile) return;

//     const fileType = getFileType(selectedFile.name);
//     if (fileType === "unknown") {
//       alert("Please upload a valid PDF or Word document.");
//       return;
//     }

//     setFile(selectedFile);
//   };

//   const handleCancelFile = () => {
//     setFile(null);
//     setFileInputKey(Date.now());
//   };

//   const handleSendMessage = async () => {
//     if (!file && !userText) return;

//     const formData = new FormData();
//     let isFileUpload = false;

//     if (file) {
//       formData.append("file", file);
//       isFileUpload = true;
//       setFile(null);
//     } else {
//       formData.append("text", userText);
//     }
//     setMessages((prevMessages) => [
//       ...prevMessages,
//       ...(isFileUpload
//         ? [
//             {
//               sender: "user",
//               fileName: file.name,
//               fileType: getFileType(file.name),
//             },
//             {
//               sender: "bot",
//               text: "Please wait, the given document is processing...",
//               id: "processing",
//             },
//           ]
//         : [{ sender: "user", text: userText }]),
//     ]);
//     setuserText("");
//     try {
//       const response = await fetch("http://127.0.0.1:8000/upload/", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Upload failed");
//       }

//       const data = await response.json();
//       console.log(data.bot_response);

//       setMessages((prevMessages) =>
//         prevMessages
//           .filter((msg) => msg.id !== "processing")
//           .concat([
//             (data.llm_response != null
//               ? { sender: "bot", text: data.llm_response }
//               : []),
//             (!(
//               data.llm_response ==
//                 "The provided document is invalid, please provide the right document" ||
//               data.llm_response == "No match job is found" ||
//               data.llm_response == "Unexpected response format" ||
//               userText
//             )
//               ? { sender: "bot", text: "Do you want to apply? (Yes/No)" }
//               : []),
//             (data.bot_response != null
//               ? { sender: "bot", text: data.bot_response }
//               : []),
//           ])
//       );
//     } catch (error) {
//       console.error("Error uploading file:", error);
//       setMessages((prevMessages) => [
//         prevMessages
//           .filter((msg) => msg.id !== "processing")
//           .concat([{ sender: "bot", text: "Error processing file." }]),
//       ]);
//     } finally {
//       setFile("");
//       setFileInputKey(Date.now());
//     }
//   };

//   return (
//     <>
//       <h1>Career Chatbot</h1>
//       <div className="chatbot-container">
//         <div className="chatbox">
//         {(messages ?? []).filter((msg) => msg && (msg.text || msg.fileName))
//   .map((msg, index) => (
//     <div key={index} className={`message ${msg.sender === "bot" ? "bot-message" : "user-message"}`}>
//       {msg.fileName ? (
//         <div className="file-message">
//           {msg.fileType === "pdf" ? (
//             <FileText className="file-icon pdf-icon" />
//           ) : (
//             <File className="file-icon doc-icon" />
//           )}
//           {msg.fileName}
//         </div>
//       ) : (
//         msg.text
//       )}
//     </div>
//   ))}

//         </div>

//         <div className="input-container">
//           <input
//             key={fileInputKey}
//             type="file"
//             className="hidden"
//             id="fileUpload"
//             accept=".pdf,.doc,.docx"
//             onChange={handleFileChange}
//           />
//           <label htmlFor="fileUpload" className="file-icon">
//             <Paperclip className="icon" />
//           </label>

//           {file ? (
//             <div className="file-preview">
//               {getFileType(file.name) === "pdf" ? (
//                 <FileText className="file-icon pdf-icon" />
//               ) : (
//                 <File className="file-icon doc-icon" />
//               )}
//               {file.name}
//               <X className="cancel-icon" onClick={handleCancelFile} />
//             </div>
//           ) : (
//             <input
//               type="text"
//               className="message-input"
//               placeholder="Type here..."
//               onChange={(e) =>
//                 setuserText(e.target.value != " " ? e.target.value : "")
//               }
//               value={userText}
//             />
//           )}

//           <button onClick={handleSendMessage} className="send-button">
//             <Send className="icon" />
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }





import { useState } from "react";
import { Paperclip, Send, X, FileText, File } from "lucide-react";
import "./Chatbot.css";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, Welcome to Edify Career Chatbot!" },
    {
      sender: "bot",
      text: "Please upload your resume to find your best-matched role.",
    },
  ]);
  const [file, setFile] = useState("");
  const [userText, setuserText] = useState("");
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [sessionId, setSessionId] = useState(""); // State to store session_id

  const getFileType = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    if (extension === "pdf") return "pdf";
    if (["doc", "docx"].includes(extension)) return "doc";
    return "unknown";
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const fileType = getFileType(selectedFile.name);
    if (fileType === "unknown") {
      alert("Please upload a valid PDF or Word document.");
      return;
    }

    setFile(selectedFile);
  };

  const handleCancelFile = () => {
    setFile(null);
    setFileInputKey(Date.now());
  };

  const handleSendMessage = async () => {
    if (!file && !userText) return;

    const formData = new FormData();
    let isFileUpload = false;

    if (file) {
      formData.append("file", file);
      isFileUpload = true;
      setFile(null);
    } else {
      formData.append("text", userText);
    }

    // Include session_id in the request if it exists
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    setMessages((prevMessages) => [
      ...prevMessages,
      ...(isFileUpload
        ? [
            {
              sender: "user",
              fileName: file.name,
              fileType: getFileType(file.name),
            },
            {
              sender: "bot",
              text: "Please wait, the given document is processing...",
              id: "processing",
            },
          ]
        : [{ sender: "user", text: userText }]),
    ]);
    setuserText("");

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log(data);

      // Update session_id if it is returned by the backend
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      setMessages((prevMessages) =>
        prevMessages
          .filter((msg) => msg.id !== "processing")
          .concat([
            ...(data.llm_response
              ? [{ sender: "bot", text: data.llm_response }]
              : []),
            ...(!(
              data.llm_response ===
                "The provided document is invalid, please provide the right document" ||
              data.llm_response === "No match job is found" ||
              data.llm_response === "Unexpected response format" ||
              userText
            )
              ? [{ sender: "bot", text: "Do you want to apply? (Yes/No)" }]
              : []),
            ...(data.bot_response
              ? [{ sender: "bot", text: data.bot_response }]
              : []),
          ])
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessages((prevMessages) => [
        ...prevMessages.filter((msg) => msg.id !== "processing"),
        { sender: "bot", text: "Error processing file." },
      ]);
    } finally {
      setFile("");
      setFileInputKey(Date.now());
    }
  };

  return (
    <>
      <h1>Career Chatbot</h1>
      <div className="chatbot-container">
        <div className="chatbox">
          {(messages ?? [])
            .filter((msg) => msg && (msg.text || msg.fileName))
            .map((msg, index) => (
              <div
                key={index}
                className={`message ${
                  msg.sender === "bot" ? "bot-message" : "user-message"
                }`}
              >
                {msg.fileName ? (
                  <div className="file-message">
                    {msg.fileType === "pdf" ? (
                      <FileText className="file-icon pdf-icon" />
                    ) : (
                      <File className="file-icon doc-icon" />
                    )}
                    {msg.fileName}
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            ))}
        </div>

        <div className="input-container">
          <input
            key={fileInputKey}
            type="file"
            className="hidden"
            id="fileUpload"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />
          <label htmlFor="fileUpload" className="file-icon">
            <Paperclip className="icon" />
          </label>

          {file ? (
            <div className="file-preview">
              {getFileType(file.name) === "pdf" ? (
                <FileText className="file-icon pdf-icon" />
              ) : (
                <File className="file-icon doc-icon" />
              )}
              {file.name}
              <X className="cancel-icon" onClick={handleCancelFile} />
            </div>
          ) : (
            <input
              type="text"
              className="message-input"
              placeholder="Type here..."
              onChange={(e) =>
                setuserText(e.target.value !== " " ? e.target.value : "")
              }
              value={userText}
            />
          )}

          <button onClick={handleSendMessage} className="send-button">
            <Send className="icon" />
          </button>
        </div>
      </div>
    </>
  );
}