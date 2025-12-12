import { useState, useRef, useEffect, useCallback } from 'react';

export interface AutoBetSettings {
    betAmount: number;
    betsCount: number; 
    onWin: number; // % increase
    onLoss: number; // % increase
    stopProfit: number;
    stopLoss: number;
}

export const useAutoBet = (
    balance: number,
    setBalance: React.Dispatch<React.SetStateAction<number>>,
    betAmount: number,
    setBetAmount: React.Dispatch<React.SetStateAction<number>>
) => {
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    const [settings, setSettings] = useState<AutoBetSettings>({
        betAmount: betAmount,
        betsCount: 0,
        onWin: 0,
        onLoss: 0,
        stopProfit: 0,
        stopLoss: 0
    });

    const stateRef = useRef({
        settings,
        balance,
        betAmount,
        isAutoBetting,
        betsMade: 0,
        profit: 0,
        initialBalance: balance
    });

    // Sync refs
    useEffect(() => {
        stateRef.current.settings = settings;
        stateRef.current.balance = balance;
        stateRef.current.betAmount = betAmount;
        stateRef.current.isAutoBetting = isAutoBetting;
    }, [settings, balance, betAmount, isAutoBetting]);

    const startAutoBet = useCallback(() => {
        setIsAutoBetting(true);
        stateRef.current.betsMade = 0;
        stateRef.current.profit = 0;
        stateRef.current.initialBalance = balance;
        // Sync bet amount to settings
        setBetAmount(settings.betAmount);
    }, [balance, settings.betAmount, setBetAmount]);

    const stopAutoBet = useCallback(() => {
        setIsAutoBetting(false);
    }, []);

    // Returns true if should continue, false if stopped
    const processResult = useCallback((win: boolean, winAmount: number) => {
        const { settings, betsMade, profit, isAutoBetting, betAmount: currentBet } = stateRef.current;
        
        if (!isAutoBetting) return false;

        const newBetsMade = betsMade + 1;
        const currentProfit = winAmount - currentBet; // winAmount is total return? Or just profit? 
        // In most games here, onGameEnd passes "win" amount (total payout).
        // If lost, winAmount is 0. Profit is -bet.
        // If win 2x, winAmount is 20. Profit is 10.
        
        const newProfit = profit + (winAmount - currentBet);
        
        stateRef.current.betsMade = newBetsMade;
        stateRef.current.profit = newProfit;

        // Check Stops
        if (settings.betsCount > 0 && newBetsMade >= settings.betsCount) {
            stopAutoBet();
            return false;
        }
        if (settings.stopProfit > 0 && newProfit >= settings.stopProfit) {
            stopAutoBet();
            return false;
        }
        if (settings.stopLoss > 0 && newProfit <= -settings.stopLoss) {
            stopAutoBet();
            return false;
        }
        
        // Calculate Next Bet
        let nextBet = currentBet;
        if (win) {
            if (settings.onWin !== 0) {
                nextBet = nextBet + (nextBet * (settings.onWin / 100));
            }
        } else {
            if (settings.onLoss !== 0) {
                 nextBet = nextBet + (nextBet * (settings.onLoss / 100));
            }
        }

        // Check Balance
        if (stateRef.current.balance < nextBet) {
             stopAutoBet();
             return false;
        }

        setBetAmount(nextBet);
        return true;
    }, [stopAutoBet, setBetAmount]);

    return {
        isAutoBetting,
        startAutoBet,
        stopAutoBet,
        processResult,
        settings,
        setSettings
    };
};
