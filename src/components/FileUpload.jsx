import React, { useRef, useState } from "react";
import { UploadCloud, File, X } from "lucide-react";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function FileUpload({ file, onFileSelect, accept, hint = "ZIP, PDF, or image files up to 25MB" }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [sizeError, setSizeError] = useState("");

  const handleFiles = (fileList) => {
    setSizeError("");
    if (fileList && fileList[0]) {
      const selected = fileList[0];
      if (selected.size > MAX_FILE_SIZE) {
        const sizeMB = (selected.size / (1024 * 1024)).toFixed(1);
        setSizeError(`File is ${sizeMB}MB — maximum allowed is 25MB.`);
        return;
      }
      onFileSelect(selected);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragActive ? "border-nexura-400 bg-white/5" : "border-white/15 hover:border-nexura-300 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <div className="flex items-center justify-between bg-white/5 rounded-lg border border-white/15 px-4 py-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-nexura-500/15 text-nexura-300 flex items-center justify-center shrink-0">
                <File className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{typeof file === "string" ? file : file.name}</p>
                <p className="text-xs text-slate">{typeof file === "string" ? "Uploaded" : `${(file.size / 1024).toFixed(0)} KB`}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="text-slate hover:text-red-400 shrink-0 ml-2"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-nexura-500/15 text-nexura-400 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-nexura-100">
              <span className="text-nexura-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate mt-1">{hint}</p>
          </>
        )}
      </div>
      {sizeError && (
        <p className="text-xs text-red-400 mt-2">{sizeError}</p>
      )}
    </div>
  );
}
