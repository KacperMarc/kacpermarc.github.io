const map = L.map("map").setView([52.2297, 21.0122], 12);
const mapStatus = document.querySelector("#map-status");
const locationButton = document.querySelector("#location-button");
const downloadButton = document.querySelector("#download-button");
const notificationButton = document.querySelector("#notification-button");
const coordinates = document.querySelector("#coordinates");
const rasterPreview = document.querySelector("#raster-preview");
const rasterPlaceholder = document.querySelector("#raster-placeholder");
const puzzleSection = document.querySelector("#puzzle-section");
const puzzleBoard = document.querySelector("#puzzle-board");
const puzzleTable = document.querySelector("#puzzle-table");
const puzzleProgress = document.querySelector("#puzzle-progress");

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  crossOrigin: true,
}).addTo(map);

let locationMarker;
let draggedPiece;
let notificationsEnabled = "Notification" in window && Notification.permission === "granted";
let completionNotified = false;

puzzleBoard.querySelectorAll(".puzzle-slot").forEach((slot) => {
  slot.addEventListener("dragover", (event) => event.preventDefault());
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedPiece) {
      return;
    }

    const source = draggedPiece.parentElement;
    const occupiedPiece = slot.firstElementChild;
    if (source === slot) {
      return;
    }

    if (occupiedPiece && source instanceof HTMLElement && source.classList.contains("puzzle-slot")) {
      source.append(occupiedPiece);
    } else if (occupiedPiece) {
      puzzleTable.append(occupiedPiece);
    }
    slot.append(draggedPiece);
    updateProgress();
  });
});

puzzleTable.addEventListener("dragover", (event) => event.preventDefault());
puzzleTable.addEventListener("drop", (event) => {
  event.preventDefault();
  if (draggedPiece && draggedPiece.parentElement !== puzzleTable) {
    puzzleTable.append(draggedPiece);
    updateProgress();
  }
});

if (notificationsEnabled) {
  notificationButton.textContent = "Powiadomienia włączone";
  notificationButton.disabled = true;
}

locationButton.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    mapStatus.textContent = "Ta przeglądarka nie obsługuje geolokalizacji.";
    return;
  }

  mapStatus.textContent = "Oczekiwanie na zgodę i odczyt lokalizacji…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const position = [coords.latitude, coords.longitude];
      coordinates.textContent = `Szerokość: ${coords.latitude.toFixed(5)}, długość: ${coords.longitude.toFixed(5)}`;
      map.setView(position, 15);

      if (locationMarker) {
        locationMarker.setLatLng(position);
      } else {
        locationMarker = L.marker(position).addTo(map);
      }

      locationMarker.bindPopup("Twoja lokalizacja").openPopup();
      mapStatus.textContent = "Lokalizacja została oznaczona na mapie.";
      captureMap((canvas) => {
        addAttribution(canvas);
        rasterPreview.src = canvas.toDataURL("image/png");
        rasterPreview.hidden = false;
        rasterPlaceholder.hidden = true;
      });
    },
    (error) => {
      const messages = {
        1: "Nie udzielono zgody na lokalizację.",
        2: "Nie udało się ustalić lokalizacji urządzenia.",
        3: "Odczyt lokalizacji przekroczył limit czasu.",
      };
      mapStatus.textContent = messages[error.code] ?? "Nie udało się pobrać lokalizacji.";
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

notificationButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    mapStatus.textContent = "Ta przeglądarka nie obsługuje powiadomień systemowych.";
    return;
  }

  const permission = await Notification.requestPermission();
  notificationsEnabled = permission === "granted";
  notificationButton.textContent = notificationsEnabled
    ? "Powiadomienia włączone"
    : "Włącz powiadomienia";
  notificationButton.disabled = notificationsEnabled;
  mapStatus.textContent = notificationsEnabled
    ? "Zgoda na powiadomienia została udzielona."
    : "Powiadomienia nie zostały włączone.";
});

downloadButton.addEventListener("click", () => {
  downloadButton.disabled = true;
  mapStatus.textContent = "Przygotowywanie rastrowego obrazu mapy…";
  captureMap((canvas) => {
    downloadButton.disabled = false;
    createPuzzle(canvas);
    addAttribution(canvas);
    const link = document.createElement("a");
    link.download = "moja-mapa.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    rasterPreview.src = link.href;
    rasterPreview.hidden = false;
    rasterPlaceholder.hidden = true;
    mapStatus.textContent = "Mapa została pobrana i podzielona na 16 puzzli.";
    puzzleSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function captureMap(onSuccess) {
  if (typeof leafletImage !== "function") {
    downloadButton.disabled = false;
    mapStatus.textContent = "Nie udało się załadować narzędzia eksportu mapy. Odśwież stronę i spróbuj ponownie.";
    return;
  }

  leafletImage(map, (error, canvas) => {
    if (error || !canvas) {
      downloadButton.disabled = false;
      mapStatus.textContent = "Nie udało się wyeksportować mapy. Sprawdź połączenie z internetem i spróbuj ponownie.";
      return;
    }

    onSuccess(canvas);
  });
}

function addAttribution(canvas) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const label = "© OpenStreetMap contributors";
  context.font = "12px sans-serif";
  const padding = 6;
  const width = context.measureText(label).width + padding * 2;
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.fillRect(canvas.width - width, canvas.height - 22, width, 22);
  context.fillStyle = "#263648";
  context.fillText(label, canvas.width - width + padding, canvas.height - 7);
}

function createPuzzle(canvas) {
  puzzleTable.replaceChildren();
  completionNotified = false;
  const slots = [...puzzleBoard.querySelectorAll(".puzzle-slot")];
  slots.forEach((slot) => {
    slot.replaceChildren();
    slot.classList.remove("is-correct");
  });

  const pieces = Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const sourceLeft = Math.floor((column * canvas.width) / 4);
    const sourceTop = Math.floor((row * canvas.height) / 4);
    const sourceRight = Math.floor(((column + 1) * canvas.width) / 4);
    const sourceBottom = Math.floor(((row + 1) * canvas.height) / 4);
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = sourceRight - sourceLeft;
    tileCanvas.height = sourceBottom - sourceTop;
    const tileContext = tileCanvas.getContext("2d");
    if (!tileContext) {
      throw new Error("Nie udało się utworzyć obrazu puzzla.");
    }
    tileContext.drawImage(
      canvas,
      sourceLeft,
      sourceTop,
      tileCanvas.width,
      tileCanvas.height,
      0,
      0,
      tileCanvas.width,
      tileCanvas.height,
    );
    const piece = document.createElement("div");
    piece.className = "puzzle-piece";
    piece.draggable = true;
    piece.dataset.pieceIndex = String(index);
    piece.setAttribute("role", "img");
    piece.setAttribute("aria-label", `Puzzle ${index + 1}`);
    piece.style.backgroundImage = `url("${tileCanvas.toDataURL("image/png")}")`;
    piece.style.backgroundSize = "100% 100%";
    piece.style.backgroundPosition = "center";
    piece.addEventListener("dragstart", (event) => {
      draggedPiece = piece;
      piece.classList.add("is-dragging");
      event.dataTransfer?.setData("text/plain", piece.dataset.pieceIndex ?? "");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });
    piece.addEventListener("dragend", () => {
      piece.classList.remove("is-dragging");
      draggedPiece = undefined;
    });
    return piece;
  });

  const shuffledPieces = [...pieces];
  for (let index = shuffledPieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledPieces[index], shuffledPieces[swapIndex]] = [shuffledPieces[swapIndex], shuffledPieces[index]];
  }
  shuffledPieces.forEach((piece) => puzzleTable.append(piece));

  puzzleProgress.textContent = "Ułożone poprawnie: 0/16";
  updateProgress();
}

function updateProgress() {
  const slots = [...puzzleBoard.children];
  let correctPieces = 0;

  slots.forEach((slot) => {
    const piece = slot.firstElementChild;
    const isCorrect = piece?.dataset.pieceIndex === slot.getAttribute("data-slot-index");
    slot.classList.toggle("is-correct", Boolean(isCorrect));
    if (isCorrect) {
      correctPieces += 1;
    }
  });

  puzzleProgress.textContent = `Ułożone poprawnie: ${correctPieces}/16`;
  if (correctPieces === 16 && !completionNotified) {
    completionNotified = true;
    mapStatus.textContent = "Gratulacje! Wszystkie puzzle są na swoim miejscu.";
    if (notificationsEnabled) {
      new Notification("Układanka ułożona!", {
        body: "Gratulacje — poprawnie ułożyłeś wszystkie 16 elementów mapy.",
      });
    }
  }
}
// kod wygenerowany za pomoca copilot
