// Contains functions for calculating technical indicators (HMA, RSI, etc.)
import config from './config.js';

// --- Indicator Calculation Functions ---

export function simpleMA(prices) {
  if (!prices || prices.length === 0) return 0;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

export function calculateWMA(prices, length) {
    if (!prices || prices.length < length) return null;
    const relevantPrices = prices.slice(-length);
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < length; i++) {
        const weight = i + 1;
        weightedSum += relevantPrices[i] * weight;
        weightSum += weight;
    }
    return weightedSum / weightSum;
}

export function calculateHMA(prices, length) {
  if (!prices || prices.length < length + Math.floor(Math.sqrt(length))) return null;

  const halfLength = Math.floor(length / 2);
  const sqrtLength = Math.floor(Math.sqrt(length));

  // Calculate WMA(period/2) for the last sqrt(period) points
  const wmaHalfData = prices.slice(-(halfLength + sqrtLength -1));
  const wmaHalfValues = [];
   for(let i = halfLength; i <= wmaHalfData.length; i++) {
        const wma = calculateWMA(wmaHalfData.slice(i - halfLength, i), halfLength);
        if (wma !== null) wmaHalfValues.push(wma);
   }
   // Ensure we have enough results for the final WMA
   if (wmaHalfValues.length < sqrtLength) return null;

   // Calculate WMA(period) for the last sqrt(period) points
  const wmaFullData = prices.slice(-(length + sqrtLength - 1));
  const wmaFullValues = [];
    for(let i = length; i <= wmaFullData.length; i++) {
        const wma = calculateWMA(wmaFullData.slice(i - length, i), length);
        if (wma !== null) wmaFullValues.push(wma);
   }
    // Ensure we have enough results for the final WMA
   if (wmaFullValues.length < sqrtLength) return null;

  // Calculate Raw HMA = 2*WMA(period/2) - WMA(period)
  const rawHMAValues = [];
  // Align the WMA arrays by taking the most recent common values
  const commonLength = Math.min(wmaHalfValues.length, wmaFullValues.length);
   const offsetHalf = wmaHalfValues.length - commonLength;
   const offsetFull = wmaFullValues.length - commonLength;

  for (let i = 0; i < commonLength; i++) {
      rawHMAValues.push(2 * wmaHalfValues[offsetHalf + i] - wmaFullValues[offsetFull + i]);
  }
    // Ensure we have enough raw HMA values for the final WMA
   if (rawHMAValues.length < sqrtLength) return null;


  // Calculate final HMA = WMA(sqrt(period)) of Raw HMA
  const finalHMA = calculateWMA(rawHMAValues, sqrtLength);

  return finalHMA;
}

export function calculateRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) return 50; // Return neutral if not enough data

  const priceSlice = prices.slice(- (period + 1)); // Get last period + 1 prices for period differences
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < priceSlice.length; i++) {
    const delta = priceSlice[i] - priceSlice[i-1];
    if (delta > 0) {
      gains += delta;
    } else {
      losses -= delta; // Losses are positive values
    }
  }

  // Use Simple Moving Average for initial average calculation based on the slice
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Could implement Wilder's Smoothing Method here for a more standard RSI
  // For now, using the simple average of the last 'period' changes

  if (avgLoss === 0) {
    return 100; // Avoid division by zero, price only went up
  }
  if (avgGain === 0) {
      return 0; // Price only went down
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}


// --- Signal Generation Function ---

export function generateSignals(prices) {
  // Ensure enough data points for HMA calculation
   // Need at least length + sqrt(length) - 1 for initial WMAs, plus 2 more for the comparisons
  const requiredLength = config.HMA_LENGTH + Math.floor(Math.sqrt(config.HMA_LENGTH)) + 1;
  if (!prices || prices.length < requiredLength) {
       // console.log(`Not enough data for ${config.CRYPTOCURRENCIES.find(c => state.priceData[c] === prices)}: ${prices.length}/${requiredLength}`);
       return [false, false];
   }

  const hmaCurrent = calculateHMA(prices, config.HMA_LENGTH);
  const hmaPrev1 = calculateHMA(prices.slice(0, -1), config.HMA_LENGTH);
  const hmaPrev2 = calculateHMA(prices.slice(0, -2), config.HMA_LENGTH);

  const rsi = calculateRSI(prices, config.RSI_PERIOD);

  if (hmaCurrent === null || hmaPrev1 === null || hmaPrev2 === null) {
      // Not enough HMA data yet, likely due to WMA returning null
      // console.log(`HMA calculation returned null for ${config.CRYPTOCURRENCIES.find(c => state.priceData[c] === prices)}`);
      return [false, false];
  }

  // Ensure RSI is within reasonable bounds (0-100), though calculation should handle it
   const currentRsi = Math.max(0, Math.min(100, rsi));

  // Long condition: HMA turned up (current > prev1, prev1 <= prev2) AND RSI not overbought
  const longCondition = hmaCurrent > hmaPrev1 && hmaPrev1 <= hmaPrev2 && currentRsi < config.RSI_OVERBOUGHT;

  // Short condition: HMA turned down (current < prev1, prev1 >= prev2) AND RSI not oversold
  const shortCondition = hmaCurrent < hmaPrev1 && hmaPrev1 >= hmaPrev2 && currentRsi > config.RSI_OVERSOLD;

  // Add some logging for debugging signals
  // const crypto = config.CRYPTOCURRENCIES.find(c => state.priceData[c] === prices); // Find which crypto this is for logging
  // console.log(`${crypto} P: ${prices[prices.length-1].toFixed(getDecimalPlaces(prices[prices.length-1]))} HMA: ${hmaCurrent?.toFixed(2)}, P1: ${hmaPrev1?.toFixed(2)}, P2: ${hmaPrev2?.toFixed(2)}, RSI: ${currentRsi.toFixed(2)} -> Long: ${longCondition}, Short: ${shortCondition}`);

  return [longCondition, shortCondition];
}