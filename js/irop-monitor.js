const IROP_API_URL =
    "https://rdu-aviation-weather.forestbrandon28.workers.dev/irops";

const REFRESH_INTERVAL_MS = 180000;

let lastAssessmentSignature = "";
let sessionTimeline = [];

function byId(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = byId(id);

    if (element) {
        element.textContent =
            value === null || value === undefined || value === ""
                ? "--"
                : String(value);
    }
}

function formatDateTime(value) {
    if (!value) {
        return "Not reported";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function formatTime(value) {
    if (!value) {
        return "Not reported";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleTimeString();
}

function formatValue(value, suffix) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Not reported";
    }

    return String(value) + (suffix || "");
}

function calculateAgeMinutes(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return Math.max(
        0,
        Math.round((Date.now() - date.getTime()) / 60000)
    );
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = text;
    }

    return element;
}

function addTimelineEntry(message) {
    const entry = {
        time: new Date().toISOString(),
        message: message
    };

    sessionTimeline.unshift(entry);
    sessionTimeline = sessionTimeline.slice(0, 30);

    renderTimeline();
}

function renderTimeline() {
    const container = byId("eventTimeline");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (sessionTimeline.length === 0) {
        const empty = createElement(
            "div",
            "timeline-entry"
        );

        empty.appendChild(
            createElement("time", "", "Pending")
        );

        empty.appendChild(
            createElement(
                "div",
                "",
                "Waiting for the first operational assessment."
            )
        );

        container.appendChild(empty);
        return;
    }

    sessionTimeline.forEach(function (entry) {
        const row = createElement(
            "div",
            "timeline-entry"
        );

        row.appendChild(
            createElement(
                "time",
                "",
                formatDateTime(entry.time)
            )
        );

        row.appendChild(
            createElement(
                "div",
                "",
                entry.message
            )
        );

        container.appendChild(row);
    });
}

function commandClass(level) {
    if (level >= 3) {
        return "command-banner command-recommended";
    }

    if (level === 2) {
        return "command-banner command-elevated";
    }

    if (level === 1) {
        return "command-banner command-monitor";
    }

    return "command-banner command-normal";
}

function renderCommandBanner(assessment) {
    const banner = byId("commandBanner");

    if (!banner) {
        return;
    }

    banner.className = commandClass(
        Number(assessment.level || 0)
    );

    setText(
        "iropLabel",
        String(assessment.label || "Normal").toUpperCase()
    );

    setText(
        "iropRecommendation",
        assessment.recommendation ||
            "Continue routine monitoring."
    );

    setText(
        "iropScore",
        assessment.score ?? 0
    );

    setText(
        "activeTriggerCount",
        assessment.activeTriggerCount ?? 0
    );

    setText(
        "declarationStatus",
        String(
            assessment.declarationStatus || "Not Declared"
        ).toUpperCase()
    );
}

function isCriticalFaaEvent(event) {
    const type = String(event.type || "").toLowerCase();

    return (
        type.includes("ground stop") ||
        type.includes("ground delay") ||
        type.includes("closure")
    );
}

function eventDetail(label, value) {
    const item = createElement(
        "div",
        "event-detail"
    );

    item.appendChild(
        createElement("span", "", label)
    );

    item.appendChild(
        createElement(
            "strong",
            "",
            value || "Not reported"
        )
    );

    return item;
}

function renderFaaOperations(faa) {
    const container = byId("faaEvents");
    const badge = byId("faaLiveBadge");

    if (!container) {
        return;
    }

    const events = Array.isArray(faa.events)
        ? faa.events
        : [];

    setText(
        "faaStatus",
        faa.active ? "ACTIVE EVENT" : "NORMAL"
    );

    setText(
        "faaSummary",
        faa.summary ||
            "No FAA status summary was returned."
    );

    setText(
        "faaUpdateTime",
        faa.feedUpdateTime || faa.checkedAt
            ? formatDateTime(
                faa.feedUpdateTime || faa.checkedAt
            )
            : "Not reported"
    );

    if (badge) {
        badge.textContent = "FAA LIVE";
        badge.className =
            "source-badge source-live";
    }

    container.innerHTML = "";

    if (events.length === 0) {
        setText("activeFaaEvent", "NONE");
        setText(
            "faaEventReason",
            "No qualifying FAA airport event reported"
        );

        container.appendChild(
            createElement(
                "div",
                "empty-state",
                "No active FAA airport event is currently reported for RDU. Individual flight delays may still exist."
            )
        );

        return;
    }

    const highestPriorityEvent =
        events.find(isCriticalFaaEvent) || events[0];

    setText(
        "activeFaaEvent",
        highestPriorityEvent.type || "FAA EVENT"
    );

    setText(
        "faaEventReason",
        highestPriorityEvent.reason ||
            "No reason reported"
    );

    events.forEach(function (event) {
        const card = createElement(
            "article",
            isCriticalFaaEvent(event)
                ? "faa-event faa-event-critical"
                : "faa-event"
        );

        card.appendChild(
            createElement(
                "h3",
                "",
                event.type || "FAA Operational Event"
            )
        );

        card.appendChild(
            createElement(
                "p",
                "",
                event.reason ||
                    "No FAA reason was included."
            )
        );

        const details = createElement(
            "div",
            "event-detail-grid"
        );

        details.appendChild(
            eventDetail(
                "Average Delay",
                event.averageDelayText ||
                    formatValue(
                        event.averageDelayMinutes,
                        " minutes"
                    )
            )
        );

        details.appendChild(
            eventDetail(
                "Maximum Delay",
                event.maximumDelayText ||
                    formatValue(
                        event.maximumDelayMinutes,
                        " minutes"
                    )
            )
        );

        details.appendChild(
            eventDetail(
                "Start",
                event.startTime
            )
        );

        details.appendChild(
            eventDetail(
                "Expected End",
                event.endTime
            )
        );

        card.appendChild(details);
        container.appendChild(card);
    });
}

function triggerIcon(trigger) {
    if (String(trigger.points).toLowerCase() === "automatic") {
        return "!";
    }

    return "+";
}

function renderTriggers(assessment) {
    const container = byId("triggerBoard");

    if (!container) {
        return;
    }

    const triggers = Array.isArray(
        assessment.activeTriggers
    )
        ? assessment.activeTriggers
        : [];

    container.innerHTML = "";

    if (triggers.length === 0) {
        container.appendChild(
            createElement(
                "div",
                "empty-state",
                "No active FAA or aviation-weather triggers were identified."
            )
        );

        return;
    }

    triggers.forEach(function (trigger) {
        const row = createElement(
            "div",
            "trigger-entry"
        );

        row.appendChild(
            createElement(
                "div",
                "trigger-icon",
                triggerIcon(trigger)
            )
        );

        const description = createElement("div");

        description.appendChild(
            createElement(
                "h3",
                "",
                trigger.trigger || "Operational Trigger"
            )
        );

        description.appendChild(
            createElement(
                "p",
                "",
                (trigger.source
                    ? trigger.source + ": "
                    : "") +
                (trigger.detail ||
                    "No detail was supplied.")
            )
        );

        row.appendChild(description);

        const automatic =
            String(trigger.points).toLowerCase() ===
            "automatic";

        row.appendChild(
            createElement(
                "div",
                automatic
                    ? "trigger-points trigger-automatic"
                    : "trigger-points",
                automatic
                    ? "AUTO"
                    : "+" + trigger.points
            )
        );

        container.appendChild(row);
    });
}

function flightCategoryClass(category) {
    const value = String(category || "").toUpperCase();

    if (value === "VFR") {
        return "flight-badge flight-vfr";
    }

    if (value === "MVFR") {
        return "flight-badge flight-mvfr";
    }

    if (value === "IFR") {
        return "flight-badge flight-ifr";
    }

    if (value === "LIFR") {
        return "flight-badge flight-lifr";
    }

    return "flight-badge";
}

function renderMetar(metar) {
    if (!metar) {
        setText("flightCategory", "UNAVAILABLE");
        setText("metarAge", "METAR unavailable");
        setText("rawMetar", "METAR data unavailable.");
        return;
    }

    const category =
        String(metar.flightCategory || "Unknown").toUpperCase();

    const categoryBadge = byId(
        "metarCategoryBadge"
    );

    setText("flightCategory", category);
    setText("metarCategoryBadge", category);

    if (categoryBadge) {
        categoryBadge.className =
            flightCategoryClass(category);
    }

    const age = calculateAgeMinutes(
        metar.reportTime
    );

    setText(
        "metarAge",
        age === null
            ? "Observation age unavailable"
            : age + " minutes old"
    );

    setText(
        "metarReportTime",
        formatDateTime(metar.reportTime)
    );

    setText(
        "metarVisibility",
        formatValue(metar.visibilitySm, " SM")
    );

    const ceiling = metar.ceiling
        ? formatValue(
            metar.ceiling.cover,
            " "
        ) +
          formatValue(
            metar.ceiling.baseFeetAgl,
            " ft AGL"
        )
        : "No BKN, OVC, or VV ceiling reported";

    setText("metarCeiling", ceiling);

    const direction =
        metar.windDirectionDegrees === null ||
        metar.windDirectionDegrees === undefined
            ? "Variable"
            : metar.windDirectionDegrees + " degrees";

    const speed = formatValue(
        metar.windSpeedKnots,
        " kt"
    );

    const gust =
        metar.windGustKnots === null ||
        metar.windGustKnots === undefined
            ? "no gust"
            : "gust " + metar.windGustKnots + " kt";

    setText(
        "metarWind",
        direction + " at " + speed + ", " + gust
    );

    setText(
        "metarTemperature",
        formatValue(metar.temperatureC, " C")
    );

    setText(
        "metarDewpoint",
        formatValue(metar.dewpointC, " C")
    );

    setText(
        "rawMetar",
        metar.rawText || "Raw METAR unavailable."
    );
}

function renderTaf(taf) {
    if (!taf) {
        setText("rawTaf", "TAF data unavailable.");
        return;
    }

    setText(
        "tafIssueTime",
        formatDateTime(taf.issueTime)
    );

    setText(
        "tafValidFrom",
        formatDateTime(taf.validFrom)
    );

    setText(
        "tafValidTo",
        formatDateTime(taf.validTo)
    );

    const periods = Array.isArray(
        taf.forecastPeriods
    )
        ? taf.forecastPeriods.length
        : 0;

    setText(
        "tafPeriodCount",
        periods
    );

    setText(
        "rawTaf",
        taf.rawText || "Raw TAF unavailable."
    );
}

function assessmentSignature(data) {
    const assessment = data.iropAssessment || {};
    const faa = data.faa || {};
    const metar =
        data.aviationWeather &&
        data.aviationWeather.metar
            ? data.aviationWeather.metar
            : {};

    return JSON.stringify({
        level: assessment.level,
        score: assessment.score,
        eventCount: faa.eventCount,
        flightCategory: metar.flightCategory,
        automaticTrigger:
            assessment.automaticTrigger
    });
}

function recordAssessmentChange(data) {
    const signature = assessmentSignature(data);

    if (signature === lastAssessmentSignature) {
        return;
    }

    const assessment = data.iropAssessment || {};
    const faa = data.faa || {};

    const description =
        "Assessment changed to " +
        String(assessment.label || "Unknown") +
        ", score " +
        String(assessment.score ?? "--") +
        ", FAA events " +
        String(faa.eventCount ?? 0) +
        ".";

    addTimelineEntry(description);
    lastAssessmentSignature = signature;
}

function renderDashboard(data) {
    const assessment = data.iropAssessment || {};
    const faa = data.faa || {};
    const weather = data.aviationWeather || {};

    setText(
        "assessmentTime",
        formatDateTime(
            assessment.evaluatedAt ||
            data.generatedAt
        )
    );

    renderCommandBanner(assessment);
    renderFaaOperations(faa);
    renderTriggers(assessment);
    renderMetar(weather.metar);
    renderTaf(weather.taf);
    recordAssessmentChange(data);

    const connection = byId("connectionStatus");

    if (connection) {
        connection.textContent =
            "Live FAA and NOAA operational data loaded. Automatic refresh every 3 minutes.";

        connection.className =
            "connection-success";
    }
}

function renderConnectionError(error) {
    const connection = byId("connectionStatus");
    const badge = byId("faaLiveBadge");
    const banner = byId("commandBanner");

    if (connection) {
        connection.textContent =
            "Operational data connection error: " +
            error.message;

        connection.className =
            "connection-error";
    }

    if (badge) {
        badge.textContent = "CONNECTION ERROR";
        badge.className =
            "source-badge source-error";
    }

    if (banner) {
        banner.className =
            "command-banner command-loading";
    }

    setText(
        "iropLabel",
        "DATA CONNECTION ERROR"
    );

    setText(
        "iropRecommendation",
        "Confirm conditions through official FAA, NOAA, airport, and organizational channels."
    );

    addTimelineEntry(
        "Operational-data connection error: " +
        error.message
    );
}

async function loadIropMonitor() {
    try {
        const separator = IROP_API_URL.includes("?")
            ? "&"
            : "?";

        const requestUrl =
            IROP_API_URL +
            separator +
            "requestTime=" +
            Date.now();

        const response = await fetch(requestUrl, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                "Worker returned HTTP " +
                response.status
            );
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(
                data.error ||
                "The IROP service returned an unavailable status."
            );
        }

        renderDashboard(data);
    } catch (error) {
        console.error(error);
        renderConnectionError(error);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    function () {
        addTimelineEntry(
            "RDU IROP monitoring session started."
        );

        loadIropMonitor();

        setInterval(
            loadIropMonitor,
            REFRESH_INTERVAL_MS
        );
    }
);
