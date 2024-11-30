"use client";
import { useState } from "react";

export default function LinkShortener() {
  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/short", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ longUrl }),
      });

      const data = await response.json();
      console.log("🚀 ~ handleSubmit ~ data:", data)
      if (response.ok) {
        setShortUrl(`${window.location.origin}/${data.shortUrl}`);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to shorten URL");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Link Shrink</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg"
      >
        <input
          type="text"
          value={longUrl}
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder="Enter long URL"
          required
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Shorten
        </button>
      </form>
      {shortUrl && (
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-semibold mb-3">Shrinked:</h2>
          <div className="flex justify-center items-center gap-2">
            <a
              href={longUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-500 break-all"
            >
              {shortUrl}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(shortUrl)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              title="Copy URL"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.25 15.75v1.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-1.5M15.75 8.25v-1.5a2.25 2.25 0 00-2.25-2.25h-7.5a2.25 2.25 0 00-2.25 2.25v7.5a2.25 2.25 0 002.25 2.25h1.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
