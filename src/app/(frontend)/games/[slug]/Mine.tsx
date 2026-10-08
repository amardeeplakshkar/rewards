'use client'
import AmountInput from "@/components/AmountInput";
import BetNumberInput from "@/components/BetNumberInput";
import MineButton from "@/components/Mine/MineButton";
import MineCustomInput from "@/components/Mine/MineCustomInput";
import MineModal from "@/components/Mine/MineModal";
import { GAME_STATUS, MINE_OBJECT, MineArea } from "@/components/Mine/types";
import ProfitAmount from "@/components/ProfitAmount";
import { BombSvg, EthSvg } from "@/components/svgs";
import SwitchTab from "@/components/SwitchTab";
import useIsMobile from "@/hooks/useIsMobile";
import Layout from "@/layout/layout";
import { api } from "@/lib/api-client";
import { Button, Switch } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
const MINE_API = "/casino/mine";
import { money } from '@/lib/format'


const toMinorUnits = (amount: number) =>
    Math.max(100, Math.round(amount * 100));
const fromMinorUnits = (minor: number) => Number((Number(minor || 0) / 100).toFixed(2));
const inr = (minor: number) => money(Math.max(0, Number(minor) || 0))
const suitIcon = (s: string) => s === 'Hearts' ? '♥' : s === 'Diamonds' ? '♦' : s === 'Clubs' ? '♣' : '♠'
const suitColor = (s: string) => s === 'Hearts' || s === 'Diamonds' ? 'text-red-500' : 'text-slate-900'

function calculateMinesGame(mines: number, picks: number, bet: number): any {
    const totalSlots = 25; // Total number of slots
    const safeSlots = totalSlots - mines; // Slots without mines

    // Function to calculate factorial
    function factorial(n: number): number {
        let value = 1;
        for (let i = 2; i <= n; i++) {
            value *= i;
        }
        return value;
    }

    // Function to calculate combinations
    function combination(n: number, k: number): number {
        if (k > n) return 0;
        return factorial(n) / (factorial(k) * factorial(n - k));
    }

    // Calculate total combinations and safe combinations
    const totalCombinations = combination(totalSlots, picks);
    const safeCombinations = combination(safeSlots, picks);

    // Calculate probability and other metrics
    let probability = 0.99 * (totalCombinations / safeCombinations);
    probability = Math.round(probability * 100) / 100;

    const winAmount = bet * probability;
    const roundedWinAmount = Math.round(winAmount * 100000000) / 100000000;

    const lossAmount = 100 / (probability - 1);
    const roundedLossAmount = Math.round(lossAmount * 100) / 100;

    const chance = 99 / probability;
    const roundedChance = Math.round(chance * 100000) / 100000;

    // Log results if conditions are met
    if (mines + picks <= totalSlots && picks > 0 && mines > 0) {
        if (mines && picks) {
            return {
                probability,
                roundedLossAmount,
                roundedChance,
                roundedWinAmount,
            };
            // console.log("Probability:", probability);
            // console.log("Loss:", roundedLossAmount);
            // console.log("Chance:", roundedChance);
            // if (bet > 0.00000000999) console.log("Win:", roundedWinAmount);
        }
    }
    return {
        probability: 0,
        roundedLossAmount: 0,
        roundedChance: 0,
        roundedWinAmount: 0,
    };
}

const MineGame: React.FC = () => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState(0); // 0 for Manual, 1 for Auto
    const [mineCount, setMineCount] = useState<number>(3);
    const [betAmount, setBetAmount] = useState<number>(0);
    const [status, setStatus] = useState<GAME_STATUS>(GAME_STATUS.READY);
    const [loading, setLoading] = useState(false);
    const [mineAreas, setMineAreas] = useState<MineArea[]>([]);
    const [autoAreas, setAutoAreas] = useState<MineArea[]>([]);
    const [roundId, setRoundId] = useState<number | null>(null);

    const statusRef = useRef<any>(null);
    const [resultVisible, setResultVisible] = useState(false);
    const [autoBetCount, setAutoBetCount] = useState(0);
    const [isInfinity, setInfinity] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [stopProfitA, setStopProfitA] = useState(0);
    const [stopLossA, setStopLossA] = useState(0);
    const [onWinP, setOnWinP] = useState(0);
    const [onLossP, setOnLossP] = useState(0);
    const [areaFlag, setAreaFlag] = useState(true);

    const [totalProfit, setProfitA] = useState<number>(0);
    const [totalLoss, setLossA] = useState<number>(0);

    const [result, setResult] = useState({
        odds: 0,
        profit: 0,
    });
    const profitAndOdds = calculateMinesGame(
        mineCount,
        mineAreas.length,
        betAmount
    );
    const resetGame = () => {
        setResultVisible(false);
        setMineAreas([]);
        setRoundId(null);
        setStatus(GAME_STATUS.READY);
        setLoading(false);
    };

    const handleApiError = (point?: number) => {
        if (point !== undefined) {
            setMineAreas(mineAreas.filter((m) => m.point !== point));
        }
        setLoading(false);
    };

    const checkActiveGame = async () => {
        try {
            const data = await api.get<{ round?: { id: number; betAmount: number; mines: number; picks: number[] } | null }>(`${MINE_API}/status`);
            const activeRound = data?.round;
            if (activeRound) {
                setRoundId(activeRound.id);
                setStatus(GAME_STATUS.LIVE);
                setMineAreas(
                    activeRound.picks.map((point) => ({
                        point,
                        mine: null,
                        mined: false,
                    }))
                );
                setBetAmount(fromMinorUnits(activeRound.betAmount));
                setMineCount(activeRound.mines);
            } else {
                setRoundId(null);
                setStatus(GAME_STATUS.READY);
            }
        } catch (error) {
            handleApiError();
        }
    };

    const createBet = async () => {
        const betAmountMU = toMinorUnits(betAmount);
        if (loading) return;
        resetGame();
        setLoading(true);
        try {
            const data = await api.post<{ id: number; mines: number; picks: number[]; balance: number }>(`${MINE_API}/create`, {
                mines: mineCount,
                betAmount: betAmountMU,
            });
            setRoundId(data?.id ?? null);
            setStatus(GAME_STATUS.LIVE);
            setMineAreas([]);
        } catch (error) {
            handleApiError();
        }
        setLoading(false);
    };

    const selectArea = async (point: number) => {
        if (GAME_STATUS.LIVE === status) return;
        const autoIndex = autoAreas.findIndex((m: MineArea) => m.point === point);
        if (autoIndex === -1) {
            setAutoAreas((prev) => [...prev, { point, mine: null, mined: false }]);
        } else {
            setAutoAreas([
                ...autoAreas.filter(
                    (m: MineArea, index: number) => index !== autoIndex
                ),
            ]);
        }
    };

    const placeBet = async (point: number) => {
        if (GAME_STATUS.READY === status || roundId === null) return;
        const mine = mineAreas.find((m: MineArea) => m.point === point);
        if (mine) return;

        setLoading(true);

        setMineAreas((prev) => [...prev, { point, mine: null, mined: false }]);

        try {
            const data = await api.post<{ status: "BET" | "LOST" | "WON"; picks: number[]; mineIndexes: number[]; payout: number; multiplier?: number; balance: number }>(`${MINE_API}/pick`, {
                roundId,
                point,
            });
            if (data.status === "BET") {
                setMineAreas((prev) =>
                    prev.map((m) =>
                        m.point === point ? { ...m, mine: MINE_OBJECT.GEM, mined: true } : m
                    )
                );
            } else {
                const revealedTiles = [
                    ...data.picks.map((pick) => ({ point: pick, mine: MINE_OBJECT.GEM, mined: true })),
                    ...data.mineIndexes.map((pick) => ({ point: pick, mine: MINE_OBJECT.BOMB, mined: true })),
                ];
                if (data.status === "WON") {
                    setResult({
                        odds: profitAndOdds.probability,
                        profit: fromMinorUnits(data.payout),
                    });
                    setResultVisible(true);
                }
                setMineAreas(revealedTiles);
                setStatus(GAME_STATUS.READY);
                setRoundId(null);
            }
        } catch (error) {
            handleApiError(point);
        }
        setLoading(false);
    };

    const cashout = async () => {
        if (status !== GAME_STATUS.LIVE || loading || mineAreas.length === 0 || roundId === null)
            return;
        setLoading(true);
        try {
            const data = await api.post<{ status: "CASHED_OUT"; payout: number; picks: number[]; mineIndexes: number[]; balance: number }>(`${MINE_API}/cashout`, {
                roundId,
            });
            setResult({
                odds: profitAndOdds.probability,
                profit: fromMinorUnits(data.payout),
            });
            setMineAreas([
                ...data.picks.map((point) => ({ point, mine: MINE_OBJECT.GEM, mined: true })),
                ...data.mineIndexes.map((point) => ({ point, mine: MINE_OBJECT.BOMB, mined: true })),
            ]);
            setStatus(GAME_STATUS.READY);
            setRoundId(null);
            setResultVisible(true);
        } catch (error) { }
        setLoading(false);
    };

    const randomBet = async () => {
        const excludeArray = mineAreas.map((m) => m.point);
        const allNumbers: number[] = Array.from({ length: 25 }, (_, i) => i); // Creates an array [0, 1, 2, ..., 24]
        const availableNumbers = allNumbers.filter(
            (num) => !excludeArray.includes(num)
        ); // Exclude numbers

        if (availableNumbers.length === 0) {
            throw new Error("No available numbers to choose from");
        }

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        placeBet(availableNumbers[randomIndex]);
    };

    const handleAmountChange = (amount: number) => {
        if (status === GAME_STATUS.READY) {
            setBetAmount(amount);
        }
    };

    const handleTabChange = (s: number) => {
        if (status === GAME_STATUS.READY) {
            setActiveTab(s);
            resetGame();
        }
    };

    const handleBetCount = (value: number) => {
        const count = value;
        if (count >= 0) {
            setAutoBetCount(value);
        }
        setInfinity(count === 0);
    };

    useEffect(() => {
        checkActiveGame();
        api.get<{ wallet: { availableBalance: number } }>('/wallet')
            .then((data) => setWalletBalance(data?.wallet?.availableBalance ?? 0))
            .catch(() => setWalletBalance(0));
    }, []);

    //------------------- auto -----------------------//

    // Function to start auto betting
    const autoBet = async () => {
        if (loading) return;
        setLoading(true);
        setInfinity(autoBetCount === 0);
        try {
            const data = await api.post<{ id: number; mines: number; picks: number[]; balance: number }>(`${MINE_API}/create`, {
                mines: mineCount,
                betAmount: toMinorUnits(betAmount),
            });
            setRoundId(data?.id ?? null);
            setStatus(GAME_STATUS.LIVE);
            setMineAreas([]);
        } catch (error) {
            setLoading(false);
            return;
        }
        setLoading(false);
    };

    // Function to stop auto betting
    const stopBet = () => {
        setLoading(false);
        setStatus(GAME_STATUS.READY);
    };

    // Function to handle the betting loop
    const runTimeBet = async () => {
        if (statusRef.current == GAME_STATUS.READY || roundId === null) return;

        setMineAreas([...autoAreas]);

        try {
            const nextPick = autoAreas.find(
                (area) => !mineAreas.some((selected) => selected.point === area.point)
            );
            if (!nextPick) {
                stopBet();
                return;
            }

            const data = await api.post<{ status: "BET" | "LOST" | "WON"; picks: number[]; mineIndexes: number[]; payout: number; balance: number }>(`${MINE_API}/pick`, {
                roundId,
                point: nextPick.point,
            });

            if (data.status === "BET") {
                setMineAreas((prev) => [...prev, { point: nextPick.point, mine: null, mined: false }]);
            } else {
                const revealedTiles = [
                    ...data.picks.map((point) => ({ point, mine: MINE_OBJECT.GEM, mined: true })),
                    ...data.mineIndexes.map((point) => ({ point, mine: MINE_OBJECT.BOMB, mined: true })),
                ];
                setMineAreas(revealedTiles);
                setRoundId(null);
                setStatus(GAME_STATUS.READY);
                setResult({ odds: calculateMinesGame(mineCount, autoAreas.length, betAmount).probability, profit: fromMinorUnits(data.payout) });
                setResultVisible(true);
            }
        } catch (error) {
            stopBet();
        }

        if (isInfinity) {
            setTimeout(() => {
                setResultVisible(false);
                setMineAreas([]);
                setTimeout(() => {
                    runTimeBet();
                }, 1000);
            }, 1500);
        } else if (autoBetCount > 0) {
            setTimeout(() => {
                setResultVisible(false);
                setMineAreas([]);
                setAutoBetCount((prevCount) => {
                    const newCount = prevCount > 0 ? prevCount - 1 : prevCount;
                    if (newCount == 0) {
                        stopBet();
                    }
                    return newCount;
                });
            }, 1500);
        } else {
            stopBet();
        }
    };

    // Automatically trigger the betting loop when autoBetCount or isAutoRun changes
    useEffect(() => {
        if (status === GAME_STATUS.LIVE && activeTab === 1) {
            setTimeout(runTimeBet, 1000); // Adjust delay as needed
        }
    }, [status, activeTab, autoBetCount]);

    // -------------auto end ---------------------//

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        if (autoAreas.length > 0) {
            setAreaFlag(true);
        }
    }, [autoAreas]);

    const disabled = GAME_STATUS.LIVE === status || loading;
    const isAuto = activeTab === 1;



    // Render mine count slider
    const renderMineCount = () => (
        <div className="mt-2 flex flex-col">
            <p className={`text-xs ${disabled ? "text-[#879097]" : "text-white"}`}>
                Mines
            </p>
            <div
                className={`flex items-center p-1.5 ${disabled ? "bg-[#172c38]" : "bg-[#0f212e]"
                    } rounded-full border-[2px] border-[#2f4553] hover:border-[#557086]`}
            >
                <div className="px-4 w-[10px] text-white">{mineCount}</div>
                <input
                    type="range"
                    min="1"
                    max="24"
                    disabled={disabled}
                    value={mineCount}
                    onChange={(e) => setMineCount(Number(e.target.value))}
                    className="mx-2 w-full h-2 bg-[#879097] rounded-lg cursor-pointer "
                />
                <div className="px-4 text-white">24</div>
            </div>
        </div>
    );

    // Render mine status fields
    const renderMineStatus = () => (
        <div className="mt-2 w-[100%]">
            <div style={{ display: "grid" }}>
                <div className="pr-2 flex flex-col" style={{ gridRow: 1 }}>
                    <p
                        className={`text-sm w-full ${disabled ? "text-[#879097]" : "text-white"
                            }`}
                    >
                        Mines
                    </p>
                    <input
                        value={mineCount}
                        disabled
                        className="bg-[#2f4553] text-white  border-[2px] border-[#2f4553] hover:border-[#557086] rounded w-full p-1.5 text-sm"
                    />
                </div>
                <div className="pl-2 flex flex-col" style={{ gridRow: 1 }}>
                    <p
                        className={`text-sm w-full ${disabled ? "text-[#879097]" : "text-white"
                            }`}
                    >
                        Games
                    </p>
                    <input
                        value={25 - mineCount - mineAreas.length}
                        disabled
                        className="bg-[#2f4553] text-white  border-[2px] border-[#2f4553] hover:border-[#557086] rounded w-full p-1.5 text-sm"
                    />
                </div>
            </div>
        </div>
    );

    // Render pick random tile button
    const renderRandomPickBtn = () => (
        <div className="mt-3 w-full">
            <Button
                onPress={randomBet}
                className=" w-full  font-bold py-2 px-4 rounded-full"
                // color="default"
            >
                Pick random tile
            </Button>
        </div>
    );

    // Render bet button
    const renderBetBtn = () => {
        const disabledbtn =
            (!isAuto && loading) || (isAuto && autoAreas.length == 0);
        return (
            <div className="mt-3 w-full">
                <Button
                    isDisabled={disabledbtn}
                    onPress={() => {
                        if (!isAuto) {
                            if (!loading) {
                                if (status === GAME_STATUS.LIVE) {
                                    cashout();
                                } else {
                                    createBet();
                                }
                            }
                        } else {
                            if (status === GAME_STATUS.LIVE) {
                                stopBet();
                            } else {
                                if (!loading) {
                                    autoBet();
                                }
                            }
                        }
                    }}
                    className={`${disabledbtn ? "bg-[#178317]" : "bg-[#00e701] hover:bg-[#00d600]"
                        } text-black font-bold py-2 px-4 rounded-full w-full flex  justify-center text-center`}
                >
                    <div className="flex text-nowrap">
                        {status === GAME_STATUS.LIVE
                            ? isAuto
                                ? "Stop Autobet"
                                : "CASHOUT"
                            : isAuto
                                ? "Start AutoBet"
                                : "BET"}
                        {loading && (
                            <div className="h-6 flex w-full items-center justify-center animate-zoom p-1">
                                <BombSvg />
                            </div>
                        )}
                    </div>
                </Button>
            </div>
        );
    };

    const renderStopProfitAmount = () => (
        <div className="mt-2">
            <p className={`text-sm ${disabled ? "text-[#879097]" : "text-white"}`}>
                Stop on Profit
            </p>
            <div
                className={`flex w-full items-center  border-[2px] border-[#2f4553] hover:border-[#557086] ${disabled ? "bg-[#172c38]" : "bg-[#0f212e]"
                    } rounded-full p-1.5`}
            >
                <input
                    disabled={disabled}
                    type="number"
                    min={0}
                    value={stopProfitA}
                    onChange={(e: any) => setStopProfitA(Number(e.target.value))}
                    className={`${disabled ? "bg-[#172c38]" : "bg-[#0f212e]"
                        } text-white  w-[90%] flex-1 text-sm focus:outline-none`}
                />
                <div className="w-5">
                    <EthSvg />
                </div>
            </div>
        </div>
    );

    const renderStopLossAmount = () => (
        <div className="mt-2">
            <p className={`text-sm ${disabled ? "text-[#879097]" : "text-white"}`}>
                Stop on Loss
            </p>
            <div
                className={`flex w-full items-center  border-[2px] border-[#2f4553] hover:border-[#557086] ${disabled ? "bg-[#172c38]" : "bg-[#0f212e]"
                    } rounded-full p-1.5`}
            >
                <input
                    disabled={disabled}
                    type="number"
                    min={0}
                    onChange={(e: any) => setStopLossA(Number(e.target.value))}
                    value={stopLossA}
                    className={`${disabled ? "bg-[#172c38]" : "bg-[#0f212e]"
                        } text-white  w-[90%] flex-1 text-sm focus:outline-none`}
                />
                <div className="w-5">
                    <EthSvg />
                </div>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="flex w-full justify-center">
                <div
                    className={` ${isMobile ? "flex flex-col items-center" : "flex items-start"} w-full rounded-md overflow-hidden gap-4`}
                >
                    {/* Main content */}
                    <div className="flex items-center w-full">
                        <div
                            className={`${isMobile ? "w-11/12" : "w-[500px] xl:w-[630px] p-5"} mx-auto relative`}
                        >
                            <div
                                className={`grid grid-cols-5 gap-2.5 p-1.5 ${!areaFlag ? "animate-bounding2" : ""
                                    } `}>
                                {[...Array(25)].map((_, index) => {
                                    const mine = mineAreas.find((m) => m.point == index);
                                    const auto = isAuto
                                        ? autoAreas.findIndex((m) => m.point == index) !== -1
                                        : false;
                                    return (
                                        <div
                                            key={index}
                                            className={`overflow-hidden max-h-[126px] ${mineAreas.length == 0 ? "animate-zoomIn" : ""
                                                } `}
                                        >
                                            <MineButton
                                                point={index}
                                                mine={mine}
                                                isAuto={auto}
                                                onClick={isAuto ? selectArea : placeBet}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <MineModal
                                visible={resultVisible}
                                data={{
                                    odds: result.odds,
                                    profit: result.profit,
                                    coin: null,
                                }}
                            />
                        </div>
                    </div>
                    {!isMobile && (
                        <div className={`xl:w-[300px]  bg-black/20 p-2 flex-shrink-0`}>
                            {isAuto ? (
                                <div className="flex flex-col">
                                    <SwitchTab onChange={handleTabChange} active={activeTab} disabled={disabled} />
                                    <AmountInput value={betAmount} onChange={handleAmountChange} disabled={disabled} amount={fromMinorUnits(walletBalance)} />
                                    {renderMineCount()}
                                    <BetNumberInput value={autoBetCount} disabled={disabled} onChange={handleBetCount} />
                                    <MineCustomInput
                                        onChange={(value) => {
                                            setOnWinP(value);
                                        }}
                                        value={onWinP}
                                        label={"On Win"}
                                        disabled={disabled}
                                    />
                                    <MineCustomInput
                                        onChange={(value) => {
                                            setOnLossP(value);
                                        }}
                                        value={onLossP}
                                        label={"On Loss"}
                                        disabled={disabled}
                                    />
                                    {renderStopProfitAmount()}
                                    {renderStopLossAmount()}
                                    {renderBetBtn()}
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <SwitchTab onChange={handleTabChange} active={activeTab} disabled={disabled} />
                                    <AmountInput value={betAmount} onChange={handleAmountChange} disabled={disabled} amount={fromMinorUnits(walletBalance)} />

                                    {status === GAME_STATUS.READY && renderMineCount()}
                                    {status === GAME_STATUS.LIVE && renderMineStatus()}
                                    {status === GAME_STATUS.LIVE && <ProfitAmount
                                        disabled={disabled}
                                        multiplier={profitAndOdds.probability}
                                        profit={profitAndOdds.roundedWinAmount}
                                        icon={
                                            <EthSvg />
                                        } />}
                                    {status === GAME_STATUS.LIVE && renderRandomPickBtn()}
                                    {renderBetBtn()}
                                </div>
                            )}
                        </div>
                    )}

                    {isMobile &&
                        (isAuto ? (
                            <div className="w-11/12 bg-black/20 p-2">
                                {renderBetBtn()}
                                <AmountInput value={betAmount} onChange={handleAmountChange} disabled={disabled} amount={fromMinorUnits(walletBalance)} />
                                {renderMineCount()}
                                <BetNumberInput value={autoBetCount} disabled={disabled} onChange={handleBetCount} />
                                <MineCustomInput
                                    onChange={(value) => {
                                        setOnWinP(value);
                                    }}
                                    value={onWinP}
                                    label={"On Win"}
                                    disabled={disabled}
                                />
                                <MineCustomInput
                                    onChange={(value) => {
                                        setOnLossP(value);
                                    }}
                                    value={onLossP}
                                    label={"On Loss"}
                                    disabled={disabled}
                                />
                                {renderStopProfitAmount()}
                                {renderStopLossAmount()}
                                <SwitchTab onChange={handleTabChange} active={activeTab} disabled={disabled} />
                            </div>
                        ) : (
                            <div className="w-11/12 bg-black/20 p-2">
                                <AmountInput value={betAmount} onChange={handleAmountChange} disabled={disabled} amount={fromMinorUnits(walletBalance)} />
                                {renderBetBtn()}
                                {status === GAME_STATUS.READY && renderMineCount()}
                                {status === GAME_STATUS.LIVE && renderMineStatus()}
                                {status === GAME_STATUS.LIVE && <ProfitAmount
                                    disabled={disabled}
                                    multiplier={profitAndOdds.probability}
                                    profit={profitAndOdds.roundedWinAmount}
                                    icon={
                                        <EthSvg />
                                    } />}
                                <SwitchTab onChange={handleTabChange} active={activeTab} disabled={disabled} />
                            </div>
                        ))}
                </div>
            </div>
        </Layout>
    );
};

export default MineGame