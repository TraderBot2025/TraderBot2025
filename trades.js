// Manages trade operations: opening, updating, closing
import config from './config.js';
import { state, setState, getLatestPrice, addOpenTrade, removeOpenTrade, addTradeToHistory, updateWalletBalance, updateTotalProfitLoss } from './state.js';
import { updateBalanceDisplay, renderOpenTrades, renderTradeHistory, getDecimalPlaces, updateProfitDisplay } from './ui.js';

// --- Trade Management Functions ---

export function openTrade(type, crypto, entryPrice) {
  if (state.openTrades.length >= config.MAX_OPEN_TRADES) {
    console.log(`Maximum open trades limit (${config.MAX_OPEN_TRADES}) reached. Cannot open new trade for ${crypto}.`);
    return;
  }

  if (state.walletBalance < config.INVESTMENT_PER_TRADE) {
    console.log("Insufficient balance to open a new trade for", crypto);
    return;
  }

  // Prevent multiple trades for the same crypto
  if (state.openTrades.some(trade => trade.crypto === crypto)) {
       console.log(`Already have an open trade for ${crypto}. Skipping new trade.`);
       return;
   }

  const stopLoss = type === 'buy'
    ? entryPrice * (1 - config.STOP_LOSS_PERCENT / 100)
    : entryPrice * (1 + config.STOP_LOSS_PERCENT / 100);

  const takeProfit = type === 'buy'
    ? entryPrice * (1 + config.TAKE_PROFIT_PERCENT / 100)
    : entryPrice * (1 - config.TAKE_PROFIT_PERCENT / 100);

  const trade = {
    id: `${Date.now()}-${crypto}-${Math.random().toString(36).substring(7)}`, // More robust unique ID
    type,
    crypto,
    entryPrice,
    stopLoss,
    takeProfit,
    investment: config.INVESTMENT_PER_TRADE,
    status: 'open',
    timestamp: new Date().toLocaleString()
  };

  addOpenTrade(trade);
  updateWalletBalance(state.walletBalance - trade.investment);
  updateBalanceDisplay();
  renderOpenTrades(); // Update UI
  console.log(`Opened ${type} trade for ${crypto} @ ${entryPrice.toFixed(getDecimalPlaces(entryPrice))} | SL: ${stopLoss.toFixed(getDecimalPlaces(stopLoss))}, TP: ${takeProfit.toFixed(getDecimalPlaces(takeProfit))}`);
}

export function updateOpenTrades() {
  const tradesToClose = [];

  state.openTrades.forEach(trade => {
    const currentPrice = getLatestPrice(trade.crypto);
    if (currentPrice === null) {
      // console.warn(`No price data available for ${trade.crypto} to update open trade.`);
      return; // Skip this trade if no price data
    }

    let shouldClose = false;
    let closeReason = '';
    let closingPrice = currentPrice; // Default to current price if not SL/TP

    if (trade.type === 'buy') {
      if (currentPrice <= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'sl';
        closingPrice = trade.stopLoss; // Close at SL price
      }
      else if (currentPrice >= trade.takeProfit) {
        shouldClose = true;
        closeReason = 'tp';
        closingPrice = trade.takeProfit; // Close at TP price
      }
    } else { // Sell trade
      if (currentPrice >= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'sl';
        closingPrice = trade.stopLoss; // Close at SL price
      }
      else if (currentPrice <= trade.takeProfit) {
        shouldClose = true;
        closeReason = 'tp';
        closingPrice = trade.takeProfit; // Close at TP price
      }
    }

    if (shouldClose) {
      tradesToClose.push({ trade, closePrice: closingPrice, reason: closeReason }); // Use the determined closing price
      console.log(`Trade ${trade.id} (${trade.type} ${trade.crypto}) marked to close. Reason: ${closeReason === 'sl' ? 'Stop Loss' : 'Take Profit'} at ${closingPrice.toFixed(getDecimalPlaces(closingPrice))} (Current price: ${currentPrice.toFixed(getDecimalPlaces(currentPrice))})`);
    }
  });

  // Close trades outside the loop to avoid modifying array while iterating
  tradesToClose.forEach(({ trade, closePrice }) => {
    closeTrade(trade, closePrice);
  });

  // Re-render open trades even if none were closed, to show updated P/L
  if(state.openTrades.length > 0){
      renderOpenTrades();
  }
}

// Function to close a specific trade by its ID, optionally forcing with current price
export function closeTradeById(tradeId, manualClose = false) {
    const trade = state.openTrades.find(t => t.id === tradeId);
    if (!trade) {
        console.error(`Trade with ID ${tradeId} not found.`);
        return;
    }

    let closePrice;
    if (manualClose) {
        closePrice = getLatestPrice(trade.crypto);
        if (closePrice === null) {
            console.error(`Cannot manually close trade ${tradeId} for ${trade.crypto}, no current price available.`);
            // Optionally, show an error message to the user
            alert(`Error: Could not get current price for ${trade.crypto} to close trade manually.`);
            return;
        }
         console.log(`Manually closing trade ${tradeId} for ${trade.crypto} at current price: ${closePrice}`);
    } else {
        // This path shouldn't normally be hit if called from updateOpenTrades,
        // but included for completeness if called elsewhere without a price.
        // It attempts to close based on SL/TP logic again.
        const currentPrice = getLatestPrice(trade.crypto);
         if (currentPrice === null) {
             console.error(`Cannot close trade ${tradeId}, no price data for ${trade.crypto}`);
             return;
         }
        if (trade.type === 'buy') {
            closePrice = (currentPrice <= trade.stopLoss) ? trade.stopLoss : (currentPrice >= trade.takeProfit ? trade.takeProfit : currentPrice);
        } else {
            closePrice = (currentPrice >= trade.stopLoss) ? trade.stopLoss : (currentPrice <= trade.takeProfit ? trade.takeProfit : currentPrice);
        }
    }

    closeTrade(trade, closePrice, manualClose);
}

// Internal function to perform the closing logic
function closeTrade(trade, closePrice, manualClose = false) {
  let profitLoss = 0;

  // Calculate P/L based on fixed investment amount
  if (trade.type === 'buy') {
    profitLoss = ((closePrice - trade.entryPrice) / trade.entryPrice) * trade.investment;
  } else { // Sell trade
    profitLoss = ((trade.entryPrice - closePrice) / trade.entryPrice) * trade.investment;
  }

  // Create a new object for the history to avoid mutating the open trade reference directly
    const closedTrade = {
        ...trade, // Copy existing properties
        closePrice: closePrice,
        profitLoss: profitLoss,
        status: 'closed',
        closeTimestamp: new Date().toLocaleString(),
        closedManually: manualClose // Add flag for manual close
    };

  // Update wallet balance: return initial investment + profit/loss
  const newBalance = state.walletBalance + trade.investment + profitLoss;
  updateWalletBalance(newBalance);
  updateTotalProfitLoss(profitLoss); // Update the total P/L state

  // Move trade from open to history
  addTradeToHistory(closedTrade);
  removeOpenTrade(trade.id); // Remove by ID

  // Update UI
  updateBalanceDisplay();
  updateProfitDisplay(); // Update the Total P/L display
  renderTradeHistory();
  renderOpenTrades(); // Re-render open trades list (will now be shorter or show "No open trades")

  const closeType = manualClose ? "Manually closed" : "Closed";
  console.log(`${closeType} ${trade.type} trade ${trade.id} for ${trade.crypto}. P/L: $${profitLoss.toFixed(2)}. New Balance: $${newBalance.toFixed(2)}`);
}