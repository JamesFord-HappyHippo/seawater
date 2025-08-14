/**
 * Unit Conversion Utilities for Seawater Climate Risk Platform
 * Provides consistent dual-unit (English/Metric) formatting
 */

// Temperature Conversions
function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5 + 32) * 10) / 10;
}

function fahrenheitToCelsius(fahrenheit) {
    return Math.round(((fahrenheit - 32) * 5/9) * 10) / 10;
}

function formatTemperature(celsius, includeUnits = true) {
    const fahrenheit = celsiusToFahrenheit(celsius);
    if (includeUnits) {
        return {
            celsius: `${celsius}°C`,
            fahrenheit: `${fahrenheit}°F`
        };
    }
    return {
        celsius: celsius,
        fahrenheit: fahrenheit
    };
}

// Distance Conversions
function metersToFeet(meters) {
    return Math.round(meters * 3.28084 * 10) / 10;
}

function feetToMeters(feet) {
    return Math.round(feet * 0.3048 * 10) / 10;
}

function kilometersToMiles(kilometers) {
    return Math.round(kilometers * 0.621371 * 10) / 10;
}

function milesToKilometers(miles) {
    return Math.round(miles * 1.60934 * 10) / 10;
}

function formatDistance(meters, unit = 'meters') {
    if (unit === 'feet') {
        const feet = meters;
        return {
            feet: feet,
            meters: feetToMeters(feet)
        };
    }
    
    return {
        meters: meters,
        feet: metersToFeet(meters)
    };
}

function formatDistanceKm(kilometers) {
    return {
        kilometers: kilometers,
        miles: kilometersToMiles(kilometers)
    };
}

// Precipitation Conversions
function millimetersToInches(millimeters) {
    return Math.round(millimeters * 0.0393701 * 10) / 10;
}

function inchesToMillimeters(inches) {
    return Math.round(inches * 25.4 * 10) / 10;
}

function formatPrecipitation(millimeters) {
    return {
        millimeters: millimeters,
        inches: millimetersToInches(millimeters)
    };
}

// Speed Conversions
function mphToKmh(mph) {
    return Math.round(mph * 1.60934 * 10) / 10;
}

function kmhToMph(kmh) {
    return Math.round(kmh * 0.621371 * 10) / 10;
}

function formatSpeed(mph) {
    return {
        mph: mph,
        kmh: mphToKmh(mph)
    };
}

// Elevation/Height Conversions
function formatElevation(feet) {
    return {
        feet: feet,
        meters: feetToMeters(feet)
    };
}

// Area Conversions
function squareFeetToSquareMeters(sqft) {
    return Math.round(sqft * 0.092903 * 10) / 10;
}

function formatArea(squareFeet) {
    return {
        squareFeet: squareFeet,
        squareMeters: squareFeetToSquareMeters(squareFeet)
    };
}

// Sea Level Rise Rate Conversions
function formatSeaLevelRise(mmPerYear) {
    return {
        millimetersPerYear: mmPerYear,
        inchesPerYear: Math.round(mmPerYear * 0.0393701 * 100) / 100
    };
}

// Erosion Rate Conversions
function formatErosionRate(feetPerYear) {
    return {
        feetPerYear: feetPerYear,
        metersPerYear: Math.round(feetPerYear * 0.3048 * 100) / 100
    };
}

// Format climate projection ranges
function formatTemperatureChange(celsius) {
    const fahrenheit = Math.round((celsius * 9/5) * 10) / 10;
    return {
        celsius: `+${celsius}`,
        fahrenheit: `+${fahrenheit}`
    };
}

function formatPrecipitationChange(millimeters) {
    return {
        millimeters: `+${millimeters}`,
        inches: `+${millimetersToInches(millimeters)}`
    };
}

// Format complex measurements for API responses
function formatClimateData(data) {
    const formatted = {};
    
    // Handle different data types
    Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Temperature values (assume Celsius input)
        if (key.includes('temperature') || key.includes('temp') || key.endsWith('C')) {
            formatted[key] = formatTemperature(value, false);
        }
        // Distance values in meters
        else if (key.includes('distance') && typeof value === 'number') {
            formatted[key] = formatDistance(value);
        }
        // Elevation values in feet
        else if (key.includes('elevation') && typeof value === 'number') {
            formatted[key] = formatElevation(value);
        }
        // Precipitation values in mm
        else if (key.includes('precipitation') || key.includes('rainfall') && typeof value === 'number') {
            formatted[key] = formatPrecipitation(value);
        }
        // Speed values in mph
        else if (key.includes('wind') || key.includes('speed') && typeof value === 'number') {
            formatted[key] = formatSpeed(value);
        }
        else {
            formatted[key] = value;
        }
    });
    
    return formatted;
}

// Human-readable formatting for reports
function formatMeasurementForReport(value, type, includeParentheses = true) {
    let formatted = '';
    
    switch (type) {
        case 'temperature':
            const tempF = celsiusToFahrenheit(value);
            formatted = includeParentheses 
                ? `${value}°C (${tempF}°F)`
                : `${value}°C / ${tempF}°F`;
            break;
            
        case 'temperature_change':
            const tempChangeF = Math.round((value * 9/5) * 10) / 10;
            formatted = includeParentheses 
                ? `+${value}°C (+${tempChangeF}°F)`
                : `+${value}°C / +${tempChangeF}°F`;
            break;
            
        case 'distance_feet':
            const meters = feetToMeters(value);
            formatted = includeParentheses 
                ? `${value} feet (${meters} meters)`
                : `${value} feet / ${meters} meters`;
            break;
            
        case 'distance_km':
            const miles = kilometersToMiles(value);
            formatted = includeParentheses 
                ? `${value} km (${miles} miles)`
                : `${value} km / ${miles} miles`;
            break;
            
        case 'precipitation':
            const inches = millimetersToInches(value);
            formatted = includeParentheses 
                ? `${value}mm (${inches} inches)`
                : `${value}mm / ${inches} inches`;
            break;
            
        case 'speed':
            const kmh = mphToKmh(value);
            formatted = includeParentheses 
                ? `${value} mph (${kmh} km/h)`
                : `${value} mph / ${kmh} km/h`;
            break;
            
        case 'sea_level_rate':
            const inchesPerYear = Math.round(value * 0.0393701 * 100) / 100;
            formatted = includeParentheses 
                ? `${value}mm (${inchesPerYear} inches) annually`
                : `${value}mm / ${inchesPerYear} inches annually`;
            break;
            
        default:
            formatted = value.toString();
    }
    
    return formatted;
}

module.exports = {
    // Basic conversions
    celsiusToFahrenheit,
    fahrenheitToCelsius,
    metersToFeet,
    feetToMeters,
    kilometersToMiles,
    milesToKilometers,
    millimetersToInches,
    inchesToMillimeters,
    mphToKmh,
    kmhToMph,
    
    // Formatting functions
    formatTemperature,
    formatDistance,
    formatDistanceKm,
    formatPrecipitation,
    formatSpeed,
    formatElevation,
    formatArea,
    formatSeaLevelRise,
    formatErosionRate,
    formatTemperatureChange,
    formatPrecipitationChange,
    
    // Complex formatting
    formatClimateData,
    formatMeasurementForReport
};