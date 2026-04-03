import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Download,
  Activity,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://ps7-backend-fhze.onrender.com"
).replace(/\/$/, "");

export default function UploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<{ url: string; label: string }[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const handlePredict = async () => {
    if (!file) return;
    setIsPredicting(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let backendMessage = "Prediction failed";
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            backendMessage = errorData.error;
          }
        } catch {
          // Keep default message when response body is not JSON.
        }
        throw new Error(backendMessage);
      }

      const data = await response.json();

      let label = "Unknown";
      let confidence = 0;

      if (data.is_ai !== undefined) {
        label = data.is_ai ? "AI Generated" : "Real Image";
        confidence = data.confidence
          ? parseFloat((data.confidence * 100).toFixed(1))
          : 0;
      } else if (data.class !== undefined) {
        // If it's a categorical output (e.g. 0=AI, 1=Real)
        // You might need to adjust this based on the actual model
        label = data.class === 0 ? "AI Generated" : "Real Image";
        confidence = data.confidence
          ? parseFloat((data.confidence * 100).toFixed(1))
          : 0;
      }

      const resultObj = {
        label: label,
        confidence: confidence,
        boxes: [],
      };

      setResult(resultObj);
      if (preview) {
        setHistory((prev) =>
          [{ url: preview, label: resultObj.label }, ...prev].slice(0, 4),
        );
      }
    } catch (error) {
      console.error("Error during prediction:", error);
      const message =
        error instanceof Error ? error.message : "Unexpected prediction error";
      alert(`Prediction failed: ${message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleDownloadReport = () => {
    if (!result || !file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;
      const isAI = result.label === "AI Generated";

      // Updated explanation text to be more direct and professional
      const explanation = isAI
        ? "The VisionAI analysis system has detected specific digital patterns and frequency artifacts associated with generative AI models. The image exhibits structural characteristics that align with the CIFAKE dataset's identified fake samples."
        : "The VisionAI analysis system has verified the pixel integrity and noise distribution of this image. The results indicate a high probability of authentic photographic origin, consistent with real-world camera sensor data.";

      // We wrap the HTML in a format that Microsoft Word understands as a .doc file
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>VisionAI Analysis Report</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'Arial', sans-serif; }
            .header { border-bottom: 2pt solid #4F46E5; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24pt; font-weight: bold; color: #0f172a; }
            .meta { font-size: 10pt; color: #64748b; margin-bottom: 30px; }
            .img-box { margin: 20px 0; text-align: center; border: 1px solid #e2e8f0; padding: 10px; }
            .results-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .results-table td { padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .label { font-size: 10pt; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .value { font-size: 18pt; font-weight: bold; }
            .verdict-ai { color: #ef4444; }
            .verdict-real { color: #22c55e; }
            .summary-title { font-size: 16pt; font-weight: bold; margin-top: 30px; border-left: 4pt solid #00f3ff; padding-left: 10px; }
            .reasoning { font-style: italic; color: #334155; padding: 20px; background: #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="title">VisionAI Analysis Report</span>
          </div>
          
          <div class="meta">
            <strong>Subject:</strong> ${file.name}<br>
            <strong>Date Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}<br>
            <strong>Report ID:</strong> #VA-${Math.floor(100000 + Math.random() * 900000)}
          </div>

          <div class="img-box">
            <img src="${base64Image}" width="450" />
            <p style="font-size: 8pt; color: #94a3b8;">Analyzed Fragment Preview</p>
          </div>

          <table class="results-table">
            <tr>
              <td>
                <div class="label">Classification Verdict</div>
                <div class="value ${isAI ? "verdict-ai" : "verdict-real"}">${result.label}</div>
              </td>
              <td>
                <div class="label">Model Confidence</div>
                <div class="value" style="color: #4F46E5;">${result.confidence}%</div>
              </td>
            </tr>
          </table>

          <div class="summary-title">Technical Summary</div>
          <div class="reasoning">
            ${explanation}
          </div>

          <div style="margin-top: 100px; font-size: 9pt; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            This document is an automated output from the VisionAI CIFAKE InceptionV3 Detection System.<br>
            Training Parameters: 98.1% Accuracy | Standard CIFAKE Dataset Benchmarking
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", htmlContent], {
        type: "application/msword",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VisionAI-Report-${file.name.split(".")[0]}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Upload & Preview Area */}
      <div className="lg:col-span-2 space-y-6">
        <div
          {...getRootProps()}
          className={`glass-card rounded-2xl p-10 border-2 border-dashed transition-all cursor-pointer text-center
            ${isDragActive ? "border-neon-cyan bg-neon-cyan/5" : "border-slate-300 dark:border-slate-600 hover:border-neon-purple/50"}`}
        >
          <input {...getInputProps()} />
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
              <UploadCloud className="w-10 h-10 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-medium">Drag & drop an image here</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                or click to browse files (JPEG, PNG)
              </p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-full object-contain"
                />

                {/* Bounding Box Overlay */}
                {result &&
                  result.boxes.map((box: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute border-2 border-neon-cyan bg-neon-cyan/20"
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-neon-cyan text-black text-xs font-bold px-2 py-1 rounded">
                        Detection
                      </span>
                    </motion.div>
                  ))}
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="text-slate-400" />
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {file?.name}
                  </span>
                </div>
                <button
                  onClick={handlePredict}
                  disabled={isPredicting || result !== null}
                  className={`px-6 py-2.5 rounded-xl font-medium text-white transition-all flex items-center space-x-2
                    ${
                      result
                        ? "bg-green-500 cursor-default"
                        : "bg-gradient-to-r from-neon-purple to-neon-cyan hover:shadow-lg hover:shadow-neon-cyan/25 active:scale-95"
                    }`}
                >
                  {isPredicting ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : result ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Analyzed</span>
                    </>
                  ) : (
                    <span>Predict Image</span>
                  )}
                </button>
              </div>

              {/* Progress Bar Simulation */}
              {isPredicting && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results & History Sidebar */}
      <div className="space-y-6">
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-2xl p-6 border-l-4 border-l-neon-cyan"
            >
              <h3 className="text-lg font-heading font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-neon-cyan" />
                Prediction Results
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Class Label
                  </p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {result.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Confidence Score
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-neon-cyan"
                      />
                    </div>
                    <span className="font-bold">{result.confidence}%</span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="w-full mt-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-heading font-semibold mb-4">
            Recent History
          </h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No recent predictions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <img
                    src={item.url}
                    alt="History"
                    className="w-12 h-12 rounded-md object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Just now
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
