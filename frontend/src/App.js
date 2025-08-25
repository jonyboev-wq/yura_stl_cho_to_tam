import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState("binary");
  const [stlLink, setStlLink] = useState("");
  const [unit, setUnit] = useState("mm");

  const handleUpload = () => {
    if (!file) {
      setMessage("Выберите файл");
      return;
    }

    if (!file.name.endsWith(".dwg")) {
      setMessage("Только .dwg файлы");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setMessage("Файл больше 100 МБ");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);
    formData.append("unit", unit);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      if (data.error === "2D-чертёж" || data.error === "Пустая модель") {
        setMessage("Предупреждение: " + data.error);
      } else {
        setMessage(data.message || data.error);
      }
      setStlLink(data.url || "");
      setProgress(0);
    };
    xhr.onerror = () => {
      setMessage("Ошибка загрузки");
      setProgress(0);
      setStlLink("");
    };
    xhr.open("POST", "http://localhost:3001/api/convert");
    xhr.send(formData);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>DWG → STL</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <select value={format} onChange={(e) => setFormat(e.target.value)}>
        <option value="binary">Binary STL</option>
        <option value="ascii">ASCII STL</option>
      </select>
      <select value={unit} onChange={(e) => setUnit(e.target.value)}>
        <option value="mm">мм</option>
        <option value="cm">см</option>
        <option value="m">м</option>
      </select>
      <button onClick={handleUpload}>Загрузить</button>
      {progress > 0 && <progress value={progress} max="100">{progress}%</progress>}
      {stlLink && (
        <p>
          <button onClick={() => window.open(`http://localhost:3001${stlLink}`, "_blank")}>Скачать STL</button>
        </p>
      )}
      <p>{message}</p>
    </div>
  );
}

export default App;
