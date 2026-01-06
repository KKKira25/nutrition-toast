
import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Info, AlertTriangle, CheckCircle, BrainCircuit, Sparkles, ArrowRight, Zap, Plus, X, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- Type Definitions ---

interface UploadedImage {
    url: string;
    file: File;
    type: string;
}

interface AnalysisData {
    productName: string;
    verdict: {
        title: string;
        color: 'green' | 'red' | string;
    };
    highlights: Array<{
        type: 'good' | 'bad' | string;
        label: string;
        value: string;
        desc: string;
    }>;
    translations: Array<{
        origin: string;
        simplified: string;
        explain: string;
    }>;
    advice: {
        target: string;
        warning: string;
        action: string;
    };
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

// --- Error Boundary Component ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Mobile Crash Log:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-900 text-center">
                    <h1 className="text-2xl font-bold mb-4">💥 發生錯誤 (Mobile Debug)</h1>
                    <p className="mb-4">請截圖傳給工程師：</p>
                    <div className="bg-white p-4 rounded shadow border border-red-200 text-left w-full overflow-auto max-h-[60vh] text-xs font-mono whitespace-pre-wrap break-all">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-red-600 text-white px-6 py-2 rounded-full font-bold"
                    >
                        重試 (Reload)
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Constants ---

const LOADING_TIPS = [
    "🥗 正在閱讀包裝上的小字...",
    "🥓 正在尋找隱藏的熱量地雷...",
    "🥑 AI 正在對照營養資料庫...",
    "🍦 快好了，正在整理重點...",
    "🧪 正在翻譯化學成分..."
];

// --- Main Component ---

const NutritionDecoderScreen = () => {
    const [currentStep, setCurrentStep] = useState<'home' | 'analyzing' | 'result'>('home');
    const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_TIPS[0]);

    // Hardcoded model selection
    const selectedModel = "gemini-2.5-flash";

    const resultCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentStep === 'analyzing') {
            let i = 0;
            interval = setInterval(() => {
                i = (i + 1) % LOADING_TIPS.length;
                setLoadingMessage(LOADING_TIPS[i]);
            }, 2000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [currentStep]);

    const compressImage = (file: File): Promise<UploadedImage> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                if (event.target?.result) {
                    img.src = event.target.result as string;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1024;
                        const MAX_HEIGHT = 1024;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);

                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            resolve({
                                url: dataUrl,
                                file: file,
                                type: 'image/jpeg'
                            });
                        }
                    };
                }
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setLoadingMessage("🖼️ 正在壓縮圖片...");

            const processPromises = files.map(file => compressImage(file));

            try {
                const processedImages = await Promise.all(processPromises);
                setSelectedImages(prev => [...prev, ...processedImages]);
            } catch (err) {
                console.error("Compression ended with error:", err);
                alert("圖片處理失敗，請試著只上傳一張。");
            }
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    function prepareImageForBackend(base64Url: string, mimeType: string) {
        const base64Data = base64Url.split(',')[1];
        return {
            type: "image",
            source: {
                type: "base64",
                media_type: mimeType,
                data: base64Data,
            },
        };
    }

    const startAnalysis = async () => {
        if (selectedImages.length === 0) return;

        setCurrentStep('analyzing');

        try {
            const imagesPayload = selectedImages.map(img => prepareImageForBackend(img.url, img.type));

            const response = await fetch('/api/analyzeImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    images: imagesPayload,
                    model: selectedModel
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const finalData = await response.json();

            setAnalysisData(finalData);
            setCurrentStep('result');

        } catch (error: any) {
            console.error("分析失敗:", error);
            alert(`糟糕！分析失敗。\n\n錯誤原因：${error.message}`);
            setCurrentStep('home');
        }
    };

    const resetApp = () => {
        setSelectedImages([]);
        setAnalysisData(null);
        setCurrentStep('home');
    };

    const handleShare = async () => {
        if (!resultCardRef.current || !analysisData) return;

        try {
            const canvas = await html2canvas(resultCardRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#ffffff',
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                if (navigator.share) {
                    const file = new File([blob], "nutrition-card.png", { type: "image/png" });
                    try {
                        await navigator.share({
                            files: [file],
                            title: '營養小精靈分析',
                            text: `看看 ${analysisData.productName} 的營養分析！`
                        });
                    } catch (err) {
                        console.log("分享被取消");
                    }
                } else {
                    const link = document.createElement('a');
                    link.download = 'nutrition-card.png';
                    link.href = canvas.toDataURL();
                    link.click();
                    alert("圖片已下載！");
                }
            }, 'image/png');

        } catch (err) {
            console.error("截圖失敗:", err);
            alert("無法製作分享圖片，請稍後再試。");
        }
    };

    return (
        <div className="min-h-screen bg-stone-100 font-sans text-slate-800 flex flex-col items-center justify-center p-4 overflow-x-hidden w-full box-border">
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden min-h-[750px] relative flex flex-col mx-auto transition-all duration-300">

                {/* HEADER */}
                {currentStep === 'result' && (
                    <div className="bg-white border-b border-stone-100 p-4 flex justify-between items-center z-10 sticky top-0">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <BrainCircuit size={24} />
                            <h1 className="text-lg font-bold tracking-wide">營養翻譯機</h1>
                        </div>
                        <button onClick={handleShare} className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-emerald-200 transition-colors">
                            <Share2 size={16} /> 分享小卡
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto bg-white relative flex flex-col w-full">

                    {/* STEP 1: 首頁 */}
                    {currentStep === 'home' && (
                        <div className="flex flex-col h-full animate-fade-in w-full">

                            <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-8 pb-16 text-white relative overflow-hidden flex flex-col items-center text-center shrink-0 min-h-[42vh] justify-center w-full">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-300 opacity-20 rounded-full -ml-8 -mb-8 blur-xl"></div>

                                <div className="inline-flex items-center gap-1.5 bg-emerald-700/50 px-3 py-1 rounded-full text-xs font-medium mb-6 border border-emerald-500/30 backdrop-blur-sm relative z-10">
                                    <Sparkles size={12} className="text-yellow-300" />
                                    <span>AI 驅動的營養小精靈</span>
                                </div>

                                <h2 className="text-3xl font-bold mb-4 tracking-tight leading-snug drop-shadow-sm whitespace-nowrap relative z-10">
                                    看不懂營養標示？
                                </h2>

                                {/* Increased max-width to prevent awkward line break */}
                                <p className="text-emerald-100 text-sm leading-relaxed opacity-90 mb-8 relative z-10 max-w-[350px]">
                                    拍張照，AI 幫你把化學名詞翻譯成「白話文」，一眼看穿是優質營養還是熱量陷阱。
                                </p>

                                <div className="flex gap-3 text-xs font-medium text-emerald-50 relative z-10">
                                    <span className="flex items-center gap-1"><CheckCircle size={14} className="text-emerald-200" /> 識別熱量</span>
                                    <span className="flex items-center gap-1"><CheckCircle size={14} className="text-emerald-200" /> 分析成分</span>
                                    <span className="flex items-center gap-1"><CheckCircle size={14} className="text-emerald-200" /> 給建議</span>
                                </div>
                            </div>

                            <div className="flex-1 bg-white relative -mt-8 rounded-t-[32px] p-8 flex flex-col items-center pt-10 w-full">

                                <h3 className="text-xl font-bold text-slate-800 mb-2">上傳包裝背面</h3>
                                <p className="text-slate-400 text-sm mb-6">請確保文字清晰 (可多張)</p>

                                <div className="w-full max-w-xs space-y-4">
                                    <label className="block w-full cursor-pointer group">
                                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

                                        <div className="w-full aspect-[4/3] border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center bg-emerald-50/30 text-emerald-600 group-hover:bg-emerald-50 group-hover:border-emerald-400 transition-all duration-300 relative overflow-hidden">

                                            {selectedImages.length === 0 ? (
                                                <>
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50 mb-3 group-hover:scale-110 transition-transform">
                                                        <Camera size={32} className="text-emerald-500" />
                                                    </div>
                                                    <span className="font-bold text-lg">拍攝或上傳</span>
                                                    <span className="text-xs text-emerald-400/80 mt-1">支援 JPG, PNG</span>
                                                </>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2 p-2 w-full h-full box-border">
                                                    {selectedImages.map((img, idx) => (
                                                        <div key={idx} className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                                            <img src={img.url} className="w-full h-full object-cover" alt="upload" />
                                                            <div onClick={(e) => { e.preventDefault(); removeImage(idx); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 cursor-pointer hover:bg-red-500 z-10">
                                                                <X size={12} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {selectedImages.length < 4 && (
                                                        <div className="flex items-center justify-center bg-white/50 border border-dashed border-emerald-300 rounded-xl">
                                                            <Plus size={24} className="text-emerald-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {selectedImages.length > 0 ? (
                                        <button
                                            onClick={startAnalysis}
                                            className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse-slow"
                                        >
                                            <Sparkles size={20} />
                                            開始分析 ({selectedImages.length})
                                        </button>
                                    ) : (
                                        <div className="h-[52px]"></div>
                                    )}

                                    <p className="text-xs text-center text-slate-300 mt-2">小精靈偶爾會出錯，請查證。</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: 分析中 */}
                    {currentStep === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[600px] p-8 text-center animate-fade-in w-full">
                            <div className="relative w-40 h-40 mb-8">
                                {selectedImages[0] && (
                                    <div className="relative w-full h-full">
                                        <img src={selectedImages[0].url} alt="Preview" className="w-full h-full object-cover rounded-full opacity-50 blur-sm border-4 border-white shadow-lg" />
                                        <div className="absolute inset-0 rounded-full border-[6px] border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin"></div>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BrainCircuit size={48} className="text-emerald-600 animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-emerald-800 mb-4 min-h-[30px] transition-all">
                                {loadingMessage}
                            </h3>

                            <div className="w-48 h-2 bg-stone-100 rounded-full overflow-hidden mb-6 mx-auto">
                                <div className="h-full bg-emerald-500 w-full animate-[loading_1.5s_infinite_ease-in-out] origin-left"></div>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 text-sm text-stone-400">
                                <Zap size={16} className="fill-current text-yellow-400" />
                                <span>AI 小精靈努力運算中...</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: 結果 */}
                    {currentStep === 'result' && analysisData && (
                        <div className="animate-slide-up pb-8 w-full">

                            <div ref={resultCardRef} className="bg-white w-full">

                                <div className="bg-slate-900 p-6 text-white text-center">
                                    <div className="text-[10px] text-emerald-400 mb-2 uppercase tracking-wider font-bold">ANALYSIS RESULT</div>
                                    <h2 className="text-2xl font-bold leading-tight break-words px-2">{analysisData.productName}</h2>
                                </div>

                                <div className="p-8 text-center border-b border-slate-100 bg-gradient-to-b from-white to-stone-50 flex flex-col items-center w-full">
                                    <div className={`w-fit mx-auto px-4 py-1.5 rounded-full text-xs font-bold mb-4 tracking-wide border ${analysisData.verdict.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        真相揭露
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 leading-snug mb-2 px-2 break-words w-full text-center">
                                        {analysisData.verdict.title}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                    {analysisData.highlights.map((item, idx) => (
                                        <div key={idx} className="p-6 flex flex-col items-center text-center">
                                            <div className={`mb-3 ${item.type === 'good' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {item.type === 'good' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                            </div>
                                            <div className="text-xs font-bold text-slate-400 mb-1">{item.label}</div>
                                            <div className="text-lg font-black text-slate-800 mb-1 break-all">{item.value}</div>

                                            {/* Visual Indicator */}
                                            <div className="w-16 h-1 bg-slate-100 rounded-full mb-2 overflow-hidden">
                                                <div className={`h-full w-full ${item.type === 'good' ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: '100%' }}></div>
                                            </div>

                                            <div className="text-xs text-slate-500 leading-normal px-1">{item.desc}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-6 justify-center">
                                        <RefreshCw size={18} className="text-blue-500" />
                                        <h4 className="font-bold text-slate-700 text-lg">成分翻譯機</h4>
                                    </div>
                                    <div className="space-y-4">
                                        {analysisData.translations.map((t, idx) => (
                                            <div key={idx} className="bg-slate-50 rounded-xl p-4 text-sm border border-slate-100 relative">
                                                <div className="flex flex-wrap items-center gap-2 mb-2 leading-none">
                                                    <span className="text-slate-400 mr-1 text-xs line-through decoration-slate-400 decoration-1">
                                                        {t.origin}
                                                    </span>
                                                    <ArrowRight size={12} className="text-slate-300 shrink-0" />
                                                    <span className="font-bold text-slate-800 bg-yellow-100 px-2 py-0.5 rounded text-sm break-all">
                                                        {t.simplified}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 text-xs leading-relaxed break-words pl-2 border-l-2 border-slate-200">
                                                    {t.explain}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-50/50 p-6 border-t border-amber-100 w-full">
                                    <div className="flex items-center justify-center gap-2 mb-4 text-amber-900">
                                        <Info size={18} />
                                        <h4 className="font-bold">營養小精靈建議</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex gap-3 items-start w-full">
                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold mt-0.5 shrink-0">適合</span>
                                            <p className="text-sm text-amber-900/80 leading-relaxed break-words flex-1 min-w-0">{analysisData.advice.target}</p>
                                        </div>
                                        <div className="flex gap-3 items-start w-full">
                                            <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold mt-0.5 shrink-0">注意</span>
                                            <p className="text-sm text-amber-900/80 leading-relaxed break-words flex-1 min-w-0">{analysisData.advice.warning}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-amber-100 text-sm font-medium text-amber-900 flex items-center justify-center text-center shadow-sm w-full break-words px-4">
                                            👉 {analysisData.advice.action}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex justify-center gap-4">
                                <button onClick={resetApp} className="w-full max-w-xs bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                    <RefreshCw size={18} /> 再拍一張
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
        @keyframes loading {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.5); }
          100% { transform: scaleX(1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
      `}</style>
        </div>
    );
};

const NutritionDecoderApp = () => (
    <ErrorBoundary>
        <NutritionDecoderScreen />
    </ErrorBoundary>
);

export default NutritionDecoderApp;
