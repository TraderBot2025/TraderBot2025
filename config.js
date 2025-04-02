export default {
  // --- Core Settings ---
  INITIAL_BALANCE: 2000,       // Starting wallet balance in USD
  INVESTMENT_PER_TRADE: 100,   // Fixed amount used for each trade in USD
  UPDATE_INTERVAL: 5,         // Simulation update frequency in seconds (faster for demo)
  MAX_OPEN_TRADES: 5,         // Maximum number of trades allowed open concurrently

  // --- Trading Strategy Parameters ---
  // Stop Loss: Percentage below entry for buys, above for sells
  STOP_LOSS_PERCENT: 1.0,      // e.g., 1.0 means 1% stop loss
  // Take Profit: Percentage above entry for buys, below for sells
  TAKE_PROFIT_PERCENT: 2.0,    // e.g., 2.0 means 2% take profit
  
  // --- Technical Indicators Settings ---
  HMA_LENGTH: 55,             // Period length for Hull Moving Average calculation
  RSI_PERIOD: 14,             // Period length for Relative Strength Index calculation
  RSI_OVERBOUGHT: 70,         // RSI level above which is considered overbought (inhibits longs)
  RSI_OVERSOLD: 30,           // RSI level below which is considered oversold (inhibits shorts)

  // --- Simulation Data & Display ---
  // List of cryptocurrencies to simulate
  // Using MATIC as Coinbase uses MATIC-USD for Polygon
  CRYPTOCURRENCIES: ["BTC", "ETH", "SOL", "XRP", "ADA", "MATIC"], 
  // Maximum number of price points to keep in memory per crypto
  MAX_PRICE_HISTORY: 200,     
  // Maximum number of closed trades to display in the history section
  MAX_HISTORY_ITEMS: 15,      
}