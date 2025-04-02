// Manages the application's state
import config from './config.js';

export let state = {
    walletBalance: config.INITIAL_BALANCE,
    totalProfitLoss: 0, // Added to track total P/L
    openTrades: [],
    tradeHistory: [],
    priceData: {}, // { "BTC": [price1, price2, ...], "ETH": [...] }
    simulationRunning: false,
};

export function initializeState() {
    // Potentially load state from localStorage in the future
    state = {
        walletBalance: config.INITIAL_BALANCE,
        totalProfitLoss: 0, // Reset P/L
        openTrades: [],
        tradeHistory: [],
        priceData: {},
        simulationRunning: false,
    };
}

// Centralized function to update state and potentially trigger re-renders or side effects
export function setState(newState) {
    state = { ...state, ...newState };
    // In a more complex app, you might trigger UI updates selectively here
    // For now, UI updates are handled directly after state changes in other modules
}

export function getPriceData(crypto) {
    return state.priceData[crypto] || [];
}

export function getLatestPrice(crypto) {
    const prices = state.priceData[crypto];
    return prices && prices.length > 0 ? prices[prices.length - 1] : null;
}

export function addOpenTrade(trade) {
    setState({ openTrades: [...state.openTrades, trade] });
}

export function removeOpenTrade(tradeId) {
    setState({ openTrades: state.openTrades.filter(t => t.id !== tradeId) });
}

export function addTradeToHistory(trade) {
    const newHistory = [trade, ...state.tradeHistory];
     if (newHistory.length > config.MAX_HISTORY_ITEMS) {
        newHistory.length = config.MAX_HISTORY_ITEMS; // Limit history size
    }
    setState({ tradeHistory: newHistory });
}

export function updateWalletBalance(newBalance) {
    setState({ walletBalance: newBalance });
}

export function updateTotalProfitLoss(profitLoss) {
    setState({ totalProfitLoss: state.totalProfitLoss + profitLoss });
}