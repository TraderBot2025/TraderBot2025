import config from './config.js';
import { state, initializeState, setState } from './state.js';
import { fetchCurrentPrice } from './api.js';
import { generateSignals } from './indicators.js';
import { openTrade, updateOpenTrades, closeTradeById } from './trades.js';
import { updateBalanceDisplay, renderCryptoPrice, renderOpenTrades, renderTradeHistory, updateProfitDisplay } from './ui.js';

// DOM Elements
const controlButton = document.getElementById('control-button');
const openTradesDiv = document.getElementById('open-trades-container'); // Get container for delegation

// State
let simulationIntervalId = null;

// --- Core Simulation Logic ---

function toggleSimulation() {
  setState({ simulationRunning: !state.simulationRunning });
  controlButton.textContent = state.simulationRunning ? 'Stop Simulation' : 'Start Simulation';
  if (state.simulationRunning) {
    // Run immediately first time, then interval
    runSimulationStep().catch(error => console.error("Initial simulation step failed:", error)); // Handle potential error on first run
    simulationIntervalId = setInterval(() => {
        runSimulationStep().catch(error => console.error("Simulation step failed:", error)); // Handle potential errors in interval
    }, config.UPDATE_INTERVAL * 1000);
  } else {
    if (simulationIntervalId) {
      clearInterval(simulationIntervalId);
      simulationIntervalId = null;
    }
  }
}

// Keep mock data for seeding initial history needed for indicators
function initializePriceData() {
  const newPriceData = {};
  config.CRYPTOCURRENCIES.forEach(crypto => {
    // Generate enough history for indicators to calculate initially
    const initialHistoryLength = Math.max(100, config.HMA_LENGTH + Math.floor(Math.sqrt(config.HMA_LENGTH)) + 2 + config.RSI_PERIOD);
    newPriceData[crypto] = generateMockPriceHistory(crypto, initialHistoryLength);
    // Render the last price from the mock history initially
    renderCryptoPrice(crypto, newPriceData[crypto][newPriceData[crypto].length - 1]);
  });
  setState({ priceData: newPriceData });
}

// Mock data generation is kept for the initial seeding
function generateMockPriceHistory(crypto, length) {
    const basePrice = {
    'BTC': 42000,
    'ETH': 2200,
    'SOL': 100,
    'XRP': 0.50,
    'ADA': 0.40,
    'MATIC': 0.75 // Added base price for MATIC (Polygon)
  }[crypto] || 100;

  const prices = [];
  let currentPrice = basePrice;
  for (let i = 0; i < length; i++) {
      const changePercent = (Math.random() - 0.49) * 0.02;
      currentPrice *= (1 + changePercent);
      currentPrice *= (1 + 0.005 * Math.sin(i / 20));
      prices.push(currentPrice);
  }
  return prices;
}

// Main simulation loop updated to use API
async function runSimulationStep() {
  if (!state.simulationRunning) return;
  console.log("Running simulation step...");

  // Create promises for all crypto price fetches
  const priceFetchPromises = config.CRYPTOCURRENCIES.map(crypto =>
    fetchCurrentPrice(crypto).then(price => ({ crypto, price })) // Resolve with crypto name and price
  );

  // Wait for all fetches to settle (complete or fail)
  const results = await Promise.allSettled(priceFetchPromises);

  let pricesUpdated = false;
  const currentPriceData = { ...state.priceData }; // Clone current price data

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.price !== null) {
      const { crypto, price } = result.value;
      const prices = currentPriceData[crypto] ? [...currentPriceData[crypto]] : []; // Clone history for this crypto

      // Add the new price and maintain history length
      prices.push(price);
      if (prices.length > config.MAX_PRICE_HISTORY) {
        prices.shift();
      }
      currentPriceData[crypto] = prices; // Update the cloned data

      // Render the updated price on the dashboard
      renderCryptoPrice(crypto, price);
      pricesUpdated = true; // Mark that at least one price was updated

      // Check for trading signals only if we have enough data
      if (prices.length >= config.HMA_LENGTH + Math.floor(Math.sqrt(config.HMA_LENGTH)) + 2) {
        const [longSignal, shortSignal] = generateSignals(prices);
        const alreadyHasOpenTrade = state.openTrades.some(trade => trade.crypto === crypto);

        if (!alreadyHasOpenTrade) {
          if (longSignal) {
            openTrade('buy', crypto, price);
          } else if (shortSignal) {
            openTrade('sell', crypto, price);
          }
        }
      }
    } else if (result.status === 'rejected') {
        // Log error if a specific crypto fetch failed
        console.error(`Failed to process price update for ${result.reason?.message?.includes('-USD') ? result.reason.message.split('-USD')[0] : 'a crypto'}:`, result.reason);
    } else if (result.value.price === null) {
        // Log if fetch succeeded but returned null (due to internal error in fetchCurrentPrice)
        console.warn(`Could not retrieve price for ${result.value.crypto}. Skipping update.`);
    }
  });

  // Update the global state with the new price data
  if (pricesUpdated) {
       setState({ priceData: currentPriceData });
   }

  // Update open trades based on the latest prices (even if some fetches failed, use last known good price)
  if (pricesUpdated) { // Only update trades if at least one price was successfully fetched
       updateOpenTrades();
   } else {
       console.warn("No prices were successfully updated in this step. Skipping trade updates.");
   }
}

// --- Event Listeners ---

function handleManualClose(event) {
    if (event.target.classList.contains('manual-close-btn')) {
        const tradeId = event.target.dataset.tradeId;
        console.log(`Manual close requested for trade ID: ${tradeId}`);
        closeTradeById(tradeId, true); // Pass true to indicate manual closure
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initializeState();
  updateBalanceDisplay();
  updateProfitDisplay(); // Initial render for P/L ($0.00)
  controlButton.addEventListener('click', toggleSimulation);
  openTradesDiv.addEventListener('click', handleManualClose); // Add listener for manual close
  initializePriceData(); // Seed price data
  renderOpenTrades(); // Initial render for "No open trades"
  renderTradeHistory(); // Initial render for "No trade history"
});