const chooseButton = document.getElementById("chooseButton");
const audioInput = document.getElementById("audioInput");

const selectedSong = document.getElementById("selectedSong");
const songName = document.getElementById("songName");

const removeButton = document.getElementById("removeButton");

const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("statusText");
const progressFill = document.getElementById("progressFill");
const statusPercent = document.getElementById("statusPercent");

const resultSection = document.getElementById("resultSection");
const downloadButton = document.getElementById("downloadButton");


// API address
const API_URL = "https://leaf-arrow-memorabilia-exclude.trycloudflare.com/separate";


// Store selected file
let selectedFile = null;


// Choose Song
chooseButton.addEventListener("click", () => {
    audioInput.click();
});


// File selected
audioInput.addEventListener("change", () => {

    if (audioInput.files.length === 0) {
        return;
    }

    selectedFile = audioInput.files[0];

    songName.textContent = selectedFile.name;

    selectedSong.classList.remove("hidden");
    removeButton.classList.remove("hidden");

    resultSection.classList.add("hidden");

    statusText.textContent = "Ready to remove vocals";
});


// Remove Vocals
removeButton.addEventListener("click", async () => {

    if (!selectedFile) {
        return;
    }

    // Disable button while processing
    removeButton.disabled = true;

    statusSection.classList.remove("hidden");
    resultSection.classList.add("hidden");

    // Reset progress
    progressFill.style.width = "10%";
    statusPercent.textContent = "10%";
    statusText.textContent = "Uploading your song...";


    try {

        // Create form data
        const formData = new FormData();

        formData.append("file", selectedFile);


        // Send song to FastAPI
        const response = await fetch(
            `${API_URL}/separate`,
            {
                method: "POST",
                body: formData
            }
        );


        if (!response.ok) {
            throw new Error("Upload failed");
        }


        const data = await response.json();

        console.log("Job:", data.job_id);


        // Start checking processing status
        checkStatus(data.job_id);


    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Something went wrong. Please try again.";

        removeButton.disabled = false;
    }
});


// Check processing status
async function checkStatus(jobId) {

    try {

        const response = await fetch(
            `${API_URL}/status/${jobId}`
        );

        const data = await response.json();

        console.log("Status:", data);


        // QUEUED
        if (data.status === "queued") {

            statusText.textContent =
                "Waiting to start processing...";

            progressFill.style.width = "20%";
            statusPercent.textContent = "20%";

            setTimeout(() => {
                checkStatus(jobId);
            }, 2000);
        }


        // PROCESSING
        else if (data.status === "processing") {

            statusText.textContent =
                "Removing vocals...";

            const progress = data.progress || 0;

            progressFill.style.width = `${progress}%`;
            statusPercent.textContent = `${progress}%`;

            setTimeout(() => {
                checkStatus(jobId);
    }, 500);
}


        // COMPLETE
        else if (data.status === "complete") {

            progressFill.style.width = "100%";
            statusPercent.textContent = "100%";

            statusText.textContent =
                "Your instrumental is ready!";

            setTimeout(() => {

                statusSection.classList.add("hidden");
                resultSection.classList.remove("hidden");

            }, 500);

            removeButton.disabled = false;


            // Download button
            downloadButton.onclick = () => {

                window.location.href =
                    `${API_URL}/download/${jobId}`;

            };
        }


        // FAILED
        else if (data.status === "failed") {

            statusText.textContent =
                "Processing failed. Please try again.";

            progressFill.style.width = "0%";
            statusPercent.textContent = "0%";

            removeButton.disabled = false;
        }

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Could not check processing status.";

        removeButton.disabled = false;
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                console.log("J-Lab service worker registered");
            })
            .catch((error) => {
                console.error("Service worker registration failed:", error);
            });
    });
}