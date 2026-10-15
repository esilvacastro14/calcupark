
// ========================================
// 1. OBTENER LOS ELEMENTOS
// ========================================

const timeMode = document.getElementById("timeMode");
const scheduleFields = document.getElementById("scheduleFields");
const durationFields = document.getElementById("durationFields");

const freeMode = document.getElementById("freeMode");
const customFreeFields = document.getElementById("customFreeFields");
const customFreeMinutes = document.getElementById("customFreeMinutes");

const initialHours = document.getElementById("initialHours");
const initialPrice = document.getElementById("initialPrice");
const initialPriceFields = document.getElementById("initialPriceFields");

const sealedEnabled = document.getElementById("sealedEnabled");
const sealedFields = document.getElementById("sealedFields");
const sealedHours = document.getElementById("sealedHours");
const sealedPrice = document.getElementById("sealedPrice");

const fractionPrice = document.getElementById("fractionPrice");
const fractionMinutes = document.getElementById("fractionMinutes");

const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const resultCard = document.getElementById("resultCard");


// ========================================
// 2. MOSTRAR U OCULTAR CAMPOS
// ========================================

function updateTimeMode() {
    const useSchedule = timeMode.value === "schedule";

    scheduleFields.hidden = !useSchedule;
    durationFields.hidden = useSchedule;
}

function updateFreeFields() {
    customFreeFields.hidden = freeMode.value !== "custom";
}

function updateInitialFields() {
    // Si no aplica una tarifa inicial, ocultamos su precio.
    initialPriceFields.hidden = initialHours.value === "0";
}

function updateSealedFields() {
    sealedFields.hidden = sealedEnabled.value !== "yes";
}

timeMode.addEventListener("change", updateTimeMode);
freeMode.addEventListener("change", updateFreeFields);
initialHours.addEventListener("change", updateInitialFields);
sealedEnabled.addEventListener("change", updateSealedFields);


// ========================================
// 3. FORMATEAR DINERO
// ========================================

function formatMoney(amount) {
    return amount.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}


// ========================================
// 4. OBTENER LA DURACIÓN
// ========================================

function getDuration() {
    if (timeMode.value === "duration") {
        if (hoursInput.value === "") {
            throw new Error("Ingresa las horas de estacionamiento.");
        }

        const hours = Number(hoursInput.value);
        const minutes = Number(minutesInput.value);

        if (
            !Number.isInteger(hours) ||
            hours < 0 ||
            hours > 168
        ) {
            throw new Error("Ingresa una cantidad válida de horas.");
        }

        return hours * 60 + minutes;
    }

    const entryTime = document.getElementById("entryTime").value;
    const exitTime = document.getElementById("exitTime").value;

    if (!entryTime || !exitTime) {
        throw new Error("Selecciona la hora de entrada y salida.");
    }

    const [entryHour, entryMinute] = entryTime.split(":").map(Number);
    const [exitHour, exitMinute] = exitTime.split(":").map(Number);

    const entryTotal = entryHour * 60 + entryMinute;
    let exitTotal = exitHour * 60 + exitMinute;

    // Si la salida es antes o igual a la entrada,
    // interpretamos que corresponde al día siguiente.
    if (exitTotal <= entryTotal) {
        exitTotal += 24 * 60;
    }

    return exitTotal - entryTotal;
}


// ========================================
// 5. OBTENER Y VALIDAR LAS TARIFAS
// ========================================

function getTariffs() {
    let courtesyMinutes;

    if (freeMode.value === "custom") {
        if (customFreeMinutes.value === "") {
            throw new Error("Ingresa los minutos de cortesía.");
        }

        courtesyMinutes = Number(customFreeMinutes.value);

        if (
            !Number.isInteger(courtesyMinutes) ||
            courtesyMinutes < 0 ||
            courtesyMinutes > 1440
        ) {
            throw new Error("El tiempo de cortesía no es válido.");
        }
    } else {
        courtesyMinutes = Number(freeMode.value);
    }

    const initialPeriodHours = Number(initialHours.value);
    const initialPeriodPrice = Number(initialPrice.value);
    const fractionCost = Number(fractionPrice.value);
    const fractionDuration = Number(fractionMinutes.value);

    if (
        initialHours.value !== "0" &&
        (
            initialPrice.value === "" ||
            !Number.isFinite(initialPeriodPrice) ||
            initialPeriodPrice < 0
        )
    ) {
        throw new Error("Ingresa un costo inicial válido.");
    }

    if (
        fractionPrice.value === "" ||
        !Number.isFinite(fractionCost) ||
        fractionCost < 0
    ) {
        throw new Error("Ingresa un costo válido por fracción.");
    }

    let specialPeriodHours = 0;
    let specialPeriodPrice = 0;

    if (sealedEnabled.value === "yes") {
        specialPeriodHours = Number(sealedHours.value);

        if (
            sealedPrice.value === "" ||
            !Number.isFinite(Number(sealedPrice.value)) ||
            Number(sealedPrice.value) < 0
        ) {
            throw new Error("Ingresa un costo válido para el boleto sellado.");
        }

        specialPeriodPrice = Number(sealedPrice.value);
    }

    return {
        courtesyMinutes,
        initialPeriodHours,
        initialPeriodPrice,
        fractionCost,
        fractionDuration,
        specialPeriodHours,
        specialPeriodPrice
    };
}


// ========================================
// 6. CALCULAR EL ESTACIONAMIENTO
// ========================================

function calculate() {
    try {
        const duration = getDuration();
        const tariffs = getTariffs();

        // Restar los minutos gratuitos del tiempo total.
        const billableMinutes = Math.max(
            0,
            duration - tariffs.courtesyMinutes
        );

        let initialCost = 0;
        let extraFractions = 0;
        let extraCost = 0;
        let initialPeriodMinutes = 0;

        // Elegir la tarifa normal o la tarifa con boleto sellado.
        if (sealedEnabled.value === "yes") {
            initialPeriodMinutes = tariffs.specialPeriodHours * 60;
            initialCost = tariffs.specialPeriodPrice;
        } else {
            initialPeriodMinutes = tariffs.initialPeriodHours * 60;
            initialCost = tariffs.initialPeriodPrice;
        }

        if (billableMinutes > 0) {
            if (initialPeriodMinutes > 0) {
                // Se cobra el precio fijo del periodo inicial.
                // Las fracciones comienzan después de ese periodo.
                if (billableMinutes > initialPeriodMinutes) {
                    const remainingMinutes =
                        billableMinutes - initialPeriodMinutes;

                    extraFractions = Math.ceil(
                        remainingMinutes / tariffs.fractionDuration
                    );

                    extraCost = extraFractions * tariffs.fractionCost;
                }
            } else {
                // Si no hay tarifa inicial, se cobran fracciones
                // desde el primer minuto que deba pagarse.
                extraFractions = Math.ceil(
                    billableMinutes / tariffs.fractionDuration
                );

                extraCost = extraFractions * tariffs.fractionCost;
            }
        } else {
            // Todo el tiempo quedó dentro de la cortesía.
            initialCost = 0;
        }

        const total = initialCost + extraCost;

        // Mostrar el resultado.
        document.getElementById("resultSubtitle").textContent =
            sealedEnabled.value === "yes"
                ? "Se aplicó la tarifa de boleto sellado."
                : "Se aplicaron las tarifas que configuraste.";

        document.getElementById("total").textContent =
            formatMoney(total);

        document.getElementById("breakdownDuration").textContent =
            formatDuration(duration);

        document.getElementById("breakdownFree").textContent =
            formatDuration(Math.min(duration, tariffs.courtesyMinutes));

        document.getElementById("breakdownFirst").textContent =
            formatMoney(initialCost);

        document.getElementById("breakdownExtra").textContent =
            formatMoney(extraCost);

        document.getElementById("breakdownFractions").textContent =
            extraFractions;

        document.getElementById("breakdownTotal").textContent =
            formatMoney(total);

        resultCard.hidden = false;

        resultCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        alert(error.message);
    }
}


// ========================================
// 7. FORMATEAR EL TIEMPO
// ========================================

function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes} minutos`;
    }

    if (minutes === 0) {
        return `${hours} ${hours === 1 ? "hora" : "horas"}`;
    }

    return `${hours} h ${minutes} min`;
}


// ========================================
// 8. VISTA PREVIA DE LA DURACIÓN
// ========================================

function updateDurationPreview() {
    const hours = Number(hoursInput.value) || 0;
    const minutes = Number(minutesInput.value) || 0;

    document.getElementById("durationPreview").textContent =
        `Tiempo total: ${formatDuration(hours * 60 + minutes)}`;
}

hoursInput.addEventListener("input", updateDurationPreview);
minutesInput.addEventListener("change", updateDurationPreview);


// ========================================
// 9. BOTÓN DE CÁLCULO
// ========================================

document.getElementById("calculateBtn")
    .addEventListener("click", calculate);


// ========================================
// 10. INICIAR LA APLICACIÓN
// ========================================

updateTimeMode();
updateFreeFields();
updateInitialFields();
updateSealedFields();
updateDurationPreview();