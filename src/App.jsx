import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [roomImage, setRoomImage] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [vibePrompt, setVibePrompt] = useState("");
  const [response, setResponse] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleRoomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 768;

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataURL = canvas.toDataURL("image/jpeg", 0.9);
        setRoomImage(resizedDataURL);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleReferenceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePlan = async () => {
    if (!roomImage || !vibePrompt.trim() || loading || cooldown) return;

    setLoading(true);
    setCooldown(true);
    setResponse("");
    setGeneratedImage("");

    // Start cooldown timer (10 sec)
    setTimeout(() => setCooldown(false), 10000);

    try {
      const { data: planData } = await axios.post(
        `${import.meta.env.VITE_API_URL}/generate-plan`,
        {
          image: roomImage,
          referenceImage,
          vibePrompt,
        }
      );

      setResponse(planData.reply);

      const { data: imageData } = await axios.post(
        `${import.meta.env.VITE_API_URL}/generate-image`,
        {
          image: roomImage,
          prompt: planData.formattedPrompt,
        }
      );

      setGeneratedImage(imageData.image);
    } catch (err) {
      setResponse("Oops, something went wrong. Try again later 💔");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-gray-800 font-sans flex flex-col items-center p-8 space-y-6">
      <h1 className="text-4xl tracking-wide font-semibold">Belle Maison</h1>

      <label className="w-full max-w-lg">
        <span className="block mb-2">Upload your empty room (required)</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleRoomImageUpload}
          className="w-full file:py-2 file:px-4 file:border file:border-gray-300 file:bg-white file:rounded-md hover:file:bg-gray-100"
        />
      </label>

      {roomImage && (
        <img src={roomImage} alt="Room Preview" className="w-full max-w-lg rounded-lg shadow" />
      )}

      <label className="w-full max-w-lg">
        <span className="block mt-4 mb-2">Upload a reference image (optional)</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleReferenceUpload}
          className="w-full file:py-2 file:px-4 file:border file:border-gray-300 file:bg-white file:rounded-md hover:file:bg-gray-100"
        />
      </label>

      {referenceImage && (
        <img src={referenceImage} alt="Reference Preview" className="w-full max-w-lg rounded-lg shadow" />
      )}

      <textarea
        value={vibePrompt}
        onChange={(e) => setVibePrompt(e.target.value)}
        placeholder="Describe your dream vibe (e.g. Japanese zen, coastal breezy, cozy Scandinavian)"
        rows={4}
        className="w-full max-w-lg p-4 mt-4 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm"
      />

      <button
        onClick={handleGeneratePlan}
        disabled={!roomImage || !vibePrompt.trim() || loading || cooldown}
        className={`px-6 py-3 rounded-md font-medium transition shadow-sm ${
          !roomImage || !vibePrompt.trim() || loading || cooldown
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-teal-600 text-white hover:bg-teal-700"
        }`}
      >
        {loading ? "Generating..." : cooldown ? "Please wait..." : "✨ Generate Design"}
      </button>

      {response && (
        <div className="w-full max-w-lg bg-white p-6 rounded-md shadow mt-4 text-left whitespace-pre-wrap">
          <h2 className="text-lg font-semibold mb-2">🧠 Design Plan:</h2>
          {response}
        </div>
      )}

      {generatedImage && (
        <div className="w-full max-w-lg mt-6 text-center">
          <h2 className="text-lg font-semibold mb-2">🖼️ Your Styled Room</h2>
          <img src={generatedImage} alt="Generated Room" className="rounded-lg shadow-lg" />
        </div>
      )}
    </div>
  );
}

export default App;
