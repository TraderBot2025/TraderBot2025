// Handles all DOM updates and rendering logic
import config from './config.js';
import { state } from './state.js'; // Import state to read data

// DOM Element References (cache them if used frequently)
const balanceDisplay = document.getElementById('balance');
const totalProfitLossDisplay = document.getElementById('total-profit-loss'); // Added
const cryptoPricesContainer = document.getElementById('crypto-prices');
const openTradesContent = document.getElementById('open-trades'); // The div inside the card
const tradeHistoryContent = document.getElementById('trade-history'); // The div inside the card

// --- UI Rendering Functions ---

export function updateBalanceDisplay() {
    if (!balanceDisplay) return;
    balanceDisplay.textContent = `$${state.walletBalance.toFixed(2)}`;
    balanceDisplay.classList.add('balance-update');
    // Remove class after animation duration
    setTimeout(() => balanceDisplay?.classList.remove('balance-update'), 500);
}

// Added function to update the Total P/L display
export function updateProfitDisplay() {
    if (!totalProfitLossDisplay) return;
    const profitLoss = state.totalProfitLoss;
    totalProfitLossDisplay.textContent = `$${profitLoss.toFixed(2)}`;
    totalProfitLossDisplay.className = profitLoss >= 0 ? 'profit' : 'loss'; // Reuse profit/loss classes
    // Optional: Add animation like balance update
    totalProfitLossDisplay.classList.add('profit-update');
    setTimeout(() => totalProfitLossDisplay?.classList.remove('profit-update'), 500);
}

export function renderCryptoPrice(crypto, price) {
    if (!cryptoPricesContainer) return;
    let cryptoElement = document.getElementById(`crypto-${crypto}`);

    // Create element if it doesn't exist
    if (!cryptoElement) {
        cryptoElement = document.createElement('div');
        cryptoElement.id = `crypto-${crypto}`;
        cryptoElement.className = 'crypto-price';
        cryptoElement.innerHTML = `
            <div class="crypto-name">${crypto}</div>
            <div class="price">$...</div>
            <div class="price-change"></div>
        `;
        cryptoPricesContainer.appendChild(cryptoElement);
    }

    const priceElement = cryptoElement.querySelector('.price');
    const changeElement = cryptoElement.querySelector('.price-change');
    if (!priceElement || !changeElement) return; // Element structure check

    // Calculate change from previous displayed price
    const oldPriceText = priceElement.textContent.replace(/[^0-9.]/g, '');
    const oldPrice = parseFloat(oldPriceText);
    const isValidOldPrice = !isNaN(oldPrice) && oldPriceText !== '...';

    const newPriceFormatted = `$${price.toFixed(getDecimalPlaces(price))}`;

    // Update price only if it's different to avoid unnecessary flashing
    if (priceElement.textContent !== newPriceFormatted) {
        priceElement.textContent = newPriceFormatted;
        priceElement.classList.add('price-update');
        setTimeout(() => priceElement.classList.remove('price-update'), 300); // Match animation duration
    }

    // Calculate and display price change if old price was valid
    if (isValidOldPrice && price !== oldPrice) {
        const priceDiff = price - oldPrice;
        const changePercent = oldPrice !== 0 ? (priceDiff / oldPrice) * 100 : 0;

        if (Math.abs(priceDiff) > 1e-9) { // Check for non-negligible difference
            changeElement.textContent = `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(getDecimalPlaces(price))} (${changePercent.toFixed(2)}%)`;
            changeElement.className = `price-change ${priceDiff > 0 ? 'positive' : 'negative'}`;
        } else {
            changeElement.textContent = '(0.00%)';
            changeElement.className = 'price-change'; // Reset class if difference is negligible
        }
    } else if (!isValidOldPrice) {
        // No valid old price, so no change to show yet
        changeElement.textContent = '';
        changeElement.className = 'price-change';
    }
     // If price is the same, do nothing to the change element
}

export function getDecimalPlaces(price) {
    if (price == null || isNaN(price)) return 2; // Default
    if (price > 1000) return 2;
    if (price > 1) return 4;
    if (price > 0.01) return 5;
    return 6; // For very low-priced assets if added
}

export function renderOpenTrades() {
    if (!openTradesContent) return;
    openTradesContent.innerHTML = ''; // Clear previous content

    if (state.openTrades.length === 0) {
        openTradesContent.innerHTML = '<p>No open trades currently.</p>';
        return;
    }

    const tradesList = document.createElement('div');
    tradesList.className = 'trades-list';

    // Sort trades alphabetically by crypto for consistent display
    const sortedOpenTrades = [...state.openTrades].sort((a, b) => a.crypto.localeCompare(b.crypto));

    sortedOpenTrades.forEach(trade => {
        const currentPrice = state.priceData[trade.crypto]?.[state.priceData[trade.crypto].length - 1];
        let currentPL = 0;
        let currentPriceDisplay = 'N/A';

        if (currentPrice != null) { // Check if price exists
            currentPriceDisplay = `$${currentPrice.toFixed(getDecimalPlaces(currentPrice))}`;
            // Calculate Unrealized P/L based on fixed investment
            if (trade.type === 'buy') {
            currentPL = ((currentPrice - trade.entryPrice) / trade.entryPrice) * trade.investment;
            } else { // Sell trade
            currentPL = ((trade.entryPrice - currentPrice) / trade.entryPrice) * trade.investment;
            }
        } else {
            // If price is not available, P/L cannot be calculated reliably
            currentPL = 0; // Or display 'N/A'
        }


        const tradeElement = document.createElement('div');
        tradeElement.className = `trade-item open ${currentPL >= 0 ? 'profit' : 'loss'}`;
        tradeElement.innerHTML = `
        <div class="trade-header">
            <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
            <span class="trade-crypto">${trade.crypto}</span>
        </div>
        <div class="trade-details">
            <div>Entry: $${trade.entryPrice.toFixed(getDecimalPlaces(trade.entryPrice))}</div>
            <div>Current: ${currentPriceDisplay}</div>
            <div>Target SL: $${trade.stopLoss.toFixed(getDecimalPlaces(trade.stopLoss))} | TP: $${trade.takeProfit.toFixed(getDecimalPlaces(trade.takeProfit))}</div>
            <div>Unrealized P/L: <span class="${currentPL >= 0 ? 'profit' : 'loss'}">${currentPrice != null ? `$${currentPL.toFixed(2)}` : 'N/A'}</span></div>
        </div>
        <div class="trade-actions">
             <button class="manual-close-btn" data-trade-id="${trade.id}">Close Manually</button>
        </div>
        <div class="trade-date">Opened: ${trade.timestamp}</div>
        `;
        tradesList.appendChild(tradeElement);
    });

    openTradesContent.appendChild(tradesList);
}

export function renderTradeHistory() {
    if (!tradeHistoryContent) return;
    tradeHistoryContent.innerHTML = ''; // Clear previous content

    if (state.tradeHistory.length === 0) {
        tradeHistoryContent.innerHTML = '<p>No trades closed yet.</p>';
        return;
    }

    const historyList = document.createElement('div');
    historyList.className = 'trades-list history';

    // History state is already sorted newest first and limited by addTradeToHistory
    state.tradeHistory.forEach(trade => {
        const historyElement = document.createElement('div');
        historyElement.className = `trade-item ${trade.profitLoss >= 0 ? 'profit' : 'loss'}`;
        historyElement.innerHTML = `
        <div class="trade-header">
            <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
            <span class="trade-crypto">${trade.crypto}</span>
            ${trade.closedManually ? '<span class="manual-close-indicator">(Manual)</span>' : ''}
        </div>
        <div class="trade-details">
            <div>Entry: $${trade.entryPrice.toFixed(getDecimalPlaces(trade.entryPrice))} | Exit: $${trade.closePrice.toFixed(getDecimalPlaces(trade.closePrice))}</div>
            <div>P/L: <span class="${trade.profitLoss >= 0 ? 'profit' : 'loss'}">$${trade.profitLoss.toFixed(2)}</span></div>
        </div>
        <div class="trade-date">Closed: ${trade.closeTimestamp}</div>
        `;
        historyList.appendChild(historyElement);
    });

    tradeHistoryContent.appendChild(historyList);
}