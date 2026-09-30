let googleMapsLoaderPromise = null;
const GOOGLE_MAPS_READY_TIMEOUT_MS = 20000;

function resolveGoogleMapsLibraries(googleMaps) {
	if (typeof googleMaps?.Map === "function") {
		return Promise.resolve(googleMaps);
	}

	if (typeof googleMaps?.importLibrary === "function") {
		return Promise.all([
			googleMaps.importLibrary("maps"),
			googleMaps.importLibrary("marker").catch(() => null),
		]).then(() => {
			if (typeof googleMaps.Map === "function") {
				return googleMaps;
			}

			throw new Error("Google Maps loaded but Map constructor is missing.");
		});
	}

	return Promise.reject(new Error("Google Maps loaded but Map constructor is missing."));
}

function waitForGoogleMapsLibraries() {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const poll = () => {
			const googleMaps = window.google?.maps;

			if (
				typeof googleMaps?.Map === "function" ||
				typeof googleMaps?.importLibrary === "function"
			) {
				resolveGoogleMapsLibraries(googleMaps).then(resolve, reject);
				return;
			}

			if (Date.now() - start >= GOOGLE_MAPS_READY_TIMEOUT_MS) {
				reject(new Error("Google Maps loaded but Map constructor is missing."));
				return;
			}

			window.setTimeout(poll, 50);
		};

		poll();
	});
}

export function loadGoogleMaps(apiKey) {
	if (!apiKey) {
		return Promise.reject(new Error("Missing API key."));
	}

	if (typeof window === "undefined") {
		return Promise.reject(new Error("Google Maps can only load in browser context."));
	}

	if (window.google?.maps) {
		return waitForGoogleMapsLibraries();
	}

	if (googleMapsLoaderPromise) {
		return googleMapsLoaderPromise;
	}

	googleMapsLoaderPromise = new Promise((resolve, reject) => {
		const existingScript = document.getElementById("motto-blocks-google-maps-api");

		const waitForGoogleMapsReady = () => waitForGoogleMapsLibraries().then(resolve, reject);

		const resolveWhenReady = () => {
			const googleMaps = window.google?.maps;
			if (
				typeof googleMaps?.Map === "function" ||
				typeof googleMaps?.importLibrary === "function"
			) {
				resolveGoogleMapsLibraries(googleMaps).then(resolve, reject);
				return true;
			}
			return false;
		};

		if (existingScript) {
			if (resolveWhenReady()) {
				return;
			}

			waitForGoogleMapsReady();
			existingScript.addEventListener(
				"load",
				() => {
					if (resolveWhenReady()) return;
					waitForGoogleMapsReady();
				},
				{ once: true }
			);

			existingScript.addEventListener(
				"error",
				() => {
					reject(new Error("Failed loading Google Maps script."));
				},
				{ once: true }
			);
			return;
		}

		const script = document.createElement("script");
		script.id = "motto-blocks-google-maps-api";
		script.async = true;
		script.defer = true;
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=maps,marker`;

		script.addEventListener(
			"load",
			() => {
				if (resolveWhenReady()) return;
				waitForGoogleMapsReady();
			},
			{ once: true }
		);

		script.addEventListener(
			"error",
			() => {
				reject(new Error("Failed loading Google Maps script."));
			},
			{ once: true }
		);

		document.head.appendChild(script);
	}).catch((error) => {
		googleMapsLoaderPromise = null;
		throw error;
	});

	return googleMapsLoaderPromise;
}
