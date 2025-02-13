// import { useState } from "react";
// import { Paperclip, Send, X, FileText, File } from "lucide-react";
// import "./Chatbot.css";

// export default function Chatbot() {
//   const [messages, setMessages] = useState([
//     { sender: "bot", text: "Hi! Please upload your resume." }
//   ]);
//   const [file, setFile] = useState(null);
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
//     if (!file) return;

//     const formData = new FormData();
//     formData.append("file", file);

//     let newMessages = [...messages];
//     newMessages.push({
//       sender: "user",
//       fileName: file.name,
//       fileType: getFileType(file.name),
//     });

//     try {
//       await fetch("http://127.0.0.1:8000/upload/", {
//         method: "POST",
//         body: formData,
//       });

//       newMessages.push({
//         sender: "bot",
//         fileName: `Uploaded: ${file.name}`,
//         fileType: getFileType(file.name),
//       });

//     } catch (error) {
//       console.error("Error uploading file:", error);
//       newMessages.push({ sender: "bot", text: "Error processing file." });
//     }

//     setMessages(newMessages);
//     setFile(null);
//     setFileInputKey(Date.now());
//   };

//   return (
//     <>
//       <h1>Career Chatbot</h1>
//       <div className="chatbot-container">
//         <div className="chatbox">
//           {messages.map((msg, index) => (
//             <div key={index} className={`message ${msg.sender === "bot" ? "bot-message" : "user-message"}`}>
//               {msg.fileName ? (
//                 <div className="file-message">
//                   {msg.fileType === "pdf" ? <FileText className="file-icon pdf-icon" /> : <File className="file-icon doc-icon" />}
//                   {msg.fileName}
//                 </div>
//               ) : (
//                 msg.text
//               )}
//             </div>
//           ))}
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

//           {/* Display filename with icon and cancel button if file is selected */}
//           {file ? (
//             <div className="file-preview">
//               {getFileType(file.name) === "pdf" ? <FileText className="file-icon pdf-icon" /> : <File className="file-icon doc-icon" />}
//               {file.name}
//               <X className="cancel-icon" onClick={handleCancelFile} />
//             </div>
//           ) : (
//             <input
//               type="text"
//               className="message-input"
//               placeholder="Upload a PDF or DOC..."
//               readOnly
//             />
//           )}

//           <button onClick={handleSendMessage} className="send-button" disabled={!file}>
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
    { sender: "bot", text: "Hi! Please upload your resume." },
  ]);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);

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
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    // setLoading(true);
    setFile(null);

    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", fileName: file.name, fileType: getFileType(file.name) },
      {
        sender: "bot",
        text: "Please wait, the given document is processing...",
        id: "processing",
      },
    ]);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      // [let botMessage = "";
      // if (data.status === "no_match") {
      //   botMessage = "No match job is found";
      // } else if (data.status === "invalid_document") {
      //   botMessage =
      //     "The provided document is invalid, please provide the right document";
      // } else if (data.status === "match_found" && data.jobs?.length > 0) {
      //   botMessage = `Matching Jobs: ${data.jobs.join(", ")}`;
      // } else {
      //   botMessage = "Unexpected response from server";
      // }]
      setMessages((prevMessages) =>
        prevMessages
          .filter((msg) => msg.id !== "processing")
          .concat([
            { sender: "bot", text: data.llm_response },
          ])
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "Error processing file." },
      ]);
    } finally {
      setLoading(false);
      setFile(null);
      setFileInputKey(Date.now());
    }
  };

  return (
    <>
      <h1>Career Chatbot</h1>
      <div className="chatbot-container">
        <div className="chatbox">
          {messages.map((msg, index) => (
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
              readOnly
            />
          )}

          <button
            onClick={handleSendMessage}
            className="send-button"
            disabled={!file || loading}
          >
            {loading ? "Uploading..." : <Send className="icon" />}
          </button>
        </div>
      </div>
    </>
  );
}
