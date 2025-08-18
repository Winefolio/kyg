import {useState, useEffect, useMemo, useCallback} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {useParams, useLocation} from "wouter";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {Badge} from "@/components/ui/badge";
import {SegmentedProgressBar} from "@/components/ui/SegmentedProgressBar";
import {MultipleChoiceQuestion} from "@/components/questions/MultipleChoiceQuestion";
import {EnhancedMultipleChoice} from "@/components/questions/EnhancedMultipleChoice";
import {ScaleQuestion} from "@/components/questions/ScaleQuestion";
import {TextQuestion} from "@/components/questions/TextQuestion";
import {BooleanQuestion} from "@/components/questions/BooleanQuestion";
import {LoadingOverlay} from "@/components/ui/loading-overlay";
import {useSessionPersistence} from "@/hooks/useSessionPersistence";
import {useHaptics} from "@/hooks/useHaptics";
import {apiRequest} from "@/lib/queryClient";
import {
    Menu,
    Users,
    BadgeCheck,
    CloudOff,
    ArrowLeft,
    ArrowRight,
    X,
    CheckCircle,
    Clock,
    Pause,
    Award,
    Wine,
    ChevronDown,
    RefreshCw
} from "lucide-react";
import {DynamicTextRenderer} from "@/components/ui/DynamicTextRenderer";
import {WineTransition} from "@/components/WineTransition";
import {WineIntroduction} from "@/components/WineIntroduction";
import {SectionTransition} from "@/components/SectionTransition";
import {WineCompletionStatus} from "@/components/WineCompletionStatus";
import {VideoMessageSlide} from "@/components/slides/VideoMessageSlide";
import {AudioMessageSlide} from "@/components/slides/AudioMessageSlide";
import {TransitionSlide} from "@/components/slides/TransitionSlide";
import {DebugErrorBoundary} from "@/components/DebugErrorBoundary";
import {prefetchUpcomingSlides, clearPrefetchCache} from "@/lib/media-prefetch";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import type {
    Slide,
    Participant,
    Session,
    Package,
    VideoMessagePayload,
    AudioMessagePayload,
    TransitionPayload
} from "@shared/schema";

// Configurable transition durations (in milliseconds)
const TRANSITION_DURATIONS = {
    slideNavigation: 300,        // Delay before changing slides - reduced from 600ms
    slideJump: 200,             // Delay when jumping to a specific slide - reduced from 400ms
    slideAnimation: {           // Framer Motion animation config
        type: "spring",
        stiffness: 200,
        damping: 25,
        mass: 0.8,
        opacity: {duration: 0.4},
        scale: {duration: 0.5}
    },
    packageIntroAnimation: {    // Special animation for package intro
        type: "spring",
        stiffness: 150,
        damping: 20,
        duration: 0.8,
        opacity: {duration: 0.6}
    }
};

export default function TastingSession() {
    const {sessionId, participantId} = useParams();
    const [, setLocation] = useLocation();

    // Check for resume parameter
    const urlParams = new URLSearchParams(window.location.search);
    const resumePosition = urlParams.get('resume');
    const initialSlideIndex = resumePosition ? Math.max(0, parseInt(resumePosition) - 1) : 0;

    const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlideIndex);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [completedSlides, setCompletedSlides] = useState<number[]>([]);
    const [isTransitioningSection, setIsTransitioningSection] = useState(false);
    const [transitionSectionName, setTransitionSectionName] = useState("");
    const [isNavigating, setIsNavigating] = useState(false);
    const [showSectionTransition, setShowSectionTransition] = useState(false);
    const [sectionTransitionData, setSectionTransitionData] = useState<{
        fromSection: string;
        toSection: string;
        wineName: string;
    } | null>(null);
    const [expandedWines, setExpandedWines] = useState<Record<string, boolean>>({});
    const [showingWineIntroduction, setShowingWineIntroduction] = useState(false);
    const [wineIntroductionData, setWineIntroductionData] = useState<{
        wine: any;
        isFirstWine: boolean;
    } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showFinalCongratulations, setShowFinalCongratulations] = useState(false);

    // Timer state for blocking wine completion screen
    const [blockingTimer, setBlockingTimer] = useState(120); // 2 minutes in seconds
    const [showSkipButton, setShowSkipButton] = useState(false); // Show skip button after timer starts running
    const [isCheckingCompletion, setIsCheckingCompletion] = useState(false); // Loading overlay before timer
    const [disableNextButton, setDisableNextButton] = useState(false);

    // Wine completion tracking state
    const [currentWineCompletionStatus, setCurrentWineCompletionStatus] = useState<{
        wineId: string | null;
        isParticipantFinished: boolean;
        showingCompletionStatus: boolean;
        hasTriggeredProcessing: boolean; // Add flag to prevent double-triggering
        isBlocking: boolean; // Add flag to block navigation until skip/timer expires
        showingAverages: boolean; // Add flag to show averages after processing
        averagesData: any; // Store the calculated averages
        isLoadingAverages: boolean; // Add flag to show loading state when calculating averages
    }>({
        wineId: null,
        isParticipantFinished: false,
        showingCompletionStatus: false,
        hasTriggeredProcessing: false,
        isBlocking: false,
        showingAverages: false,
        averagesData: null,
        isLoadingAverages: false
    });

    const {saveResponse, syncStatus, initializeForSession, endSession} = useSessionPersistence();
    const {triggerHaptic} = useHaptics();
    const queryClient = useQueryClient();

    // Step 3: Sentiment Analysis Mutation
    const sentimentAnalysisMutation = useMutation({
        mutationFn: async ({sessionId, wineId}: { sessionId: string; wineId: string }) => {
            return await apiRequest('POST', `/api/sessions/${sessionId}/wines/${wineId}/sentiment-analysis`, {});
        },
        onError: (error) => {
            console.error('Sentiment analysis failed:', error);
            // Non-blocking error - sentiment analysis is supplementary
        }
    });

    // Step 4: Average Calculation Mutation
    const averageCalculationMutation = useMutation({
        mutationFn: async ({sessionId, wineId}: { sessionId: string; wineId: string }) => {
            const response = await apiRequest('POST', `/api/sessions/${sessionId}/wines/${wineId}/calculate-averages`, {});
            const data = await response.json();
            return data;
        },
        onSuccess: (data, variables) => {
            // Enhanced data parsing to match the backend's new format
            let averagesData;
            if (data && typeof data === 'object') {
                // The backend now returns data in enhanced format with multiple access paths
                const apiData = data as any;

                // Try all possible data access paths from backend
                if (apiData.questions && typeof apiData.questions === 'object' && Object.keys(apiData.questions).length > 0) {
                    // Primary path: questions object with question details
                    averagesData = {
                        questions: apiData.questions,
                        data: apiData.questions,
                        averages: apiData.questions,
                        sessionId: apiData.sessionId,
                        wineId: apiData.wineId,
                        totalQuestions: apiData.totalQuestions,
                        scaleQuestions: apiData.scaleQuestions,
                        timestamp: apiData.timestamp
                    };
                } else if (apiData.data && typeof apiData.data === 'object' && Object.keys(apiData.data).length > 0) {
                    // Alternative path 1: data object
                    averagesData = {
                        questions: apiData.data,
                        data: apiData.data,
                        averages: apiData.data,
                        sessionId: apiData.sessionId,
                        wineId: apiData.wineId,
                        totalQuestions: apiData.totalQuestions,
                        scaleQuestions: apiData.scaleQuestions,
                        timestamp: apiData.timestamp
                    };
                } else if (apiData.averages && typeof apiData.averages === 'object' && Object.keys(apiData.averages).length > 0) {
                    // Alternative path 2: averages object  
                    averagesData = {
                        questions: apiData.averages,
                        data: apiData.averages,
                        averages: apiData.averages,
                        sessionId: apiData.sessionId,
                        wineId: apiData.wineId,
                        totalQuestions: apiData.totalQuestions,
                        scaleQuestions: apiData.scaleQuestions,
                        timestamp: apiData.timestamp
                    };
                } else if (apiData.results && Array.isArray(apiData.results) && apiData.results.length > 0) {
                    // Handle array format from backend
                    const questionsObj: Record<string, any> = {};
                    apiData.results.forEach((result: any, index: number) => {
                        if (result.questionType === 'scale' && result.averageScore !== null && result.averageScore !== undefined) {
                            const questionId = result.slideId || `question-${index}`;
                            questionsObj[questionId] = {
                                id: questionId,
                                questionId: questionId,
                                slideId: result.slideId,
                                questionTitle: result.questionTitle,
                                title: result.questionTitle,
                                question: result.questionTitle,
                                average: result.averageScore,
                                avg: result.averageScore,
                                value: result.averageScore,
                                participantCount: result.totalResponses,
                                participants: result.totalResponses,
                                count: result.totalResponses,
                                responseCount: result.totalResponses,
                                scaleMax: 10,
                                scale_max: 10,
                                questionType: result.questionType,
                                responseDistribution: result.responseDistribution,
                                timestamp: result.timestamp
                            };
                        }
                    });

                    if (Object.keys(questionsObj).length > 0) {
                        averagesData = {
                            questions: questionsObj,
                            data: questionsObj,
                            averages: questionsObj,
                            sessionId: apiData.sessionId,
                            wineId: apiData.wineId,
                            totalQuestions: apiData.results.length,
                            scaleQuestions: Object.keys(questionsObj).length,
                            timestamp: apiData.timestamp
                        };
                    } else {
                        // Even if no scale questions, show something rather than error
                        averagesData = {
                            questions: {},
                            data: apiData,
                            averages: apiData,
                            sessionId: apiData.sessionId,
                            wineId: apiData.wineId,
                            totalQuestions: apiData.results?.length || 0,
                            scaleQuestions: 0,
                            timestamp: apiData.timestamp,
                            message: 'No scale questions found for this wine'
                        };
                    }
                } else {
                    // Last resort: show the raw data without error
                    averagesData = {
                        questions: {},
                        data: apiData,
                        averages: apiData,
                        sessionId: apiData.sessionId,
                        wineId: apiData.wineId,
                        totalQuestions: apiData.totalQuestions || 0,
                        scaleQuestions: apiData.scaleQuestions || 0,
                        timestamp: apiData.timestamp,
                        message: 'Raw data available but no structured averages'
                    };
                }
            } else {
                // Handle invalid response format, but don't show error - show empty state
                averagesData = {
                    questions: {},
                    data: {},
                    averages: {},
                    message: 'No data received from server'
                };
            }

            // ALWAYS show the averages modal, even if there are no questions
            setCurrentWineCompletionStatus(prev => ({
                ...prev,
                showingAverages: true,
                averagesData: averagesData,
                isBlocking: false, // Stop blocking timer
                isLoadingAverages: false // Stop showing loading state
            }));
        },
        onError: (error) => {
            console.error('Average calculation failed:', error);
            // Even if averages fail, we should still show the modal with an error message
            setCurrentWineCompletionStatus(prev => ({
                ...prev,
                showingAverages: true,
                averagesData: {error: 'Failed to calculate averages'},
                isBlocking: false, // Stop blocking timer, but start blocking with error message
                isLoadingAverages: false // Stop showing loading state
            }));
        }
    });

    // Initialize session storage when component mounts
    useEffect(() => {
        if (sessionId && participantId) {
            initializeForSession(sessionId, participantId);
        }
    }, [sessionId, participantId, initializeForSession]);

    // Clear prefetch cache on unmount
    useEffect(() => {
        return () => {
            clearPrefetchCache();
        };
    }, []);

    // Monitor focus changes globally
    useEffect(() => {
        const handleFocusChange = () => {
            // Focus change handling can be added here if needed
        };

        document.addEventListener('focusin', handleFocusChange);
        document.addEventListener('focusout', handleFocusChange);

        return () => {
            document.removeEventListener('focusin', handleFocusChange);
            document.removeEventListener('focusout', handleFocusChange);
        };
    }, []);

    // Get session details including status - handle both session ID and package code
    const {data: currentSession, isLoading: sessionDetailsLoading} = useQuery<Session & { packageCode?: string }>({
        queryKey: [`/api/sessions/${sessionId}`],
        queryFn: async () => {
            // First try as session ID
            try {
                const response = await apiRequest('GET', `/api/sessions/${sessionId}`, null);
                return response.json();
            } catch (error: any) {
                // If 404, try looking up by package code
                if (error.message.includes('404')) {
                    // Session not found as ID, trying as package code
                    const response = await apiRequest('GET', `/api/sessions/by-package/${sessionId}`, null);
                    return response.json();
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        refetchInterval: (data: any) => {
            // Only refetch frequently for waiting/paused sessions
            if (data?.status === 'waiting' || data?.status === 'paused') {
                return 3000; // 3 seconds for status changes
            }
            return 30000; // 30 seconds for active sessions
        },
        // Add some caching to reduce object recreation
        staleTime: 2000, // 2 seconds - allow brief caching
    });

    // Invalidate slides query when session status changes
    useEffect(() => {
        if (currentSession?.status) {
            // Invalidate the slides query to force a refetch
            queryClient.invalidateQueries({
                queryKey: [`/api/packages/${currentSession?.packageCode}/slides`]
            });
        }
    }, [currentSession?.status, currentSession?.packageCode, queryClient]);

    // Get participant data
    const {data: participant, error: participantError} = useQuery<Participant>({
        queryKey: [`/api/participants/${participantId}`],
        enabled: !!participantId
    });

    // Log participant fetch status
    useEffect(() => {
        if (participantError) {
            console.error('[TASTING_SESSION] Error loading participant:', participantError);
        }
    }, [participant, participantError]);

    // Memoize query key dependencies to prevent unnecessary refetches
    const slidesQueryKey = useMemo(() => {
        return [
            'slides',
            currentSession?.packageCode,
            participantId,
            currentSession?.status
        ];
    }, [currentSession?.packageCode, participantId, currentSession?.status]);

    // Get session slides and wine data - use dynamic package code from session
    const {data: slidesData, isLoading, refetch: refetchSlides, dataUpdatedAt} = useQuery<{
        package: Package;
        slides: Slide[];
        totalCount: number;
        wines: any[]
    }>({
        queryKey: slidesQueryKey,
        queryFn: async () => {
            const response = await apiRequest('GET', `/api/packages/${currentSession?.packageCode}/slides?participantId=${participantId}`, null);
            return response.json();
        },
        enabled: !!currentSession?.packageCode && !!participantId,
        // Allow reasonable caching to prevent excessive refetches
        staleTime: 30000, // 30 seconds - slides don't change that often
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false, // Don't refetch on every focus change
        refetchOnReconnect: true
    });

    // Extract wines data from slides response
    const packageData = slidesData ? {wines: slidesData.wines} : null;

    // Get session participants to determine if we need timers/results
    const {data: sessionParticipants, isLoading: participantsLoading} = useQuery<any[]>({
        queryKey: [`/api/sessions/${sessionId}/participants`],
        queryFn: async () => {
            const response = await apiRequest('GET', `/api/sessions/${sessionId}/participants`, null);
            return response.json();
        },
        enabled: !!sessionId,
        staleTime: 30000, // Cache for 30 seconds
    });

    // Get participant responses
    const {data: responses} = useQuery<Response[]>({
        queryKey: [`/api/participants/${participantId}/responses`],
        enabled: !!participantId
    });

    // Load previous responses into answers state
    useEffect(() => {
        if (responses && responses.length > 0) {
            // Loading previous responses

            const previousAnswers: Record<string, any> = {};
            responses.forEach((response: any) => {
                previousAnswers[response.slideId] = response.answerJson;
            });

            setAnswers(previousAnswers);
        }
    }, [responses, participantId, resumePosition]);


    // Memoize expensive slides processing to prevent recalculation on every render
    // Must be called before any early returns to follow Rules of Hooks
    const processedSlidesData = useMemo(() => {
        if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
            return {
                slides: [],
                wines: [],
                sortedSlidesByWine: {},
                packageIntroSlides: [],
                getSlideSection: (slide: any) => 'intro',
                isLastSlideOfSection: () => false
            };
        }

        const allSlides = slidesData.slides || [];
        const wines = slidesData.wines || [];

        // Include transition slides in the navigation flow
        const rawSlides = allSlides;

        // Separate package-level slides from wine-level slides
        const packageLevelSlides = rawSlides.filter(slide => slide.packageId && !slide.packageWineId);
        const wineLevelSlides = rawSlides.filter(slide => slide.packageWineId);

        // Group wine-level slides by wine
        const slidesByWine = wineLevelSlides.reduce((acc: Record<string, any[]>, slide) => {
            const wineId = slide.packageWineId;
            if (!wineId) return acc; // Skip slides without packageWineId
            if (!acc[wineId]) {
                acc[wineId] = [];
            }
            acc[wineId].push(slide);
            return acc;
        }, {});

        // Handle package intro slides
        let packageIntroSlides: any[] = packageLevelSlides.sort((a, b) => (a.globalPosition || 0) - (b.globalPosition || 0));
        const wineSpecificSlidesByWine: Record<string, any[]> = {};

        Object.keys(slidesByWine).forEach(wineId => {
            const wineSlides = slidesByWine[wineId];
            const wine = wines.find(w => w.id === wineId);


            // Sort slides by position
            const sortedWineSlides = wineSlides.sort((a, b) => a.position - b.position);

            // DON'T extract package intro - treat all slides as wine-specific for consistent section math
            wineSpecificSlidesByWine[wineId] = sortedWineSlides;

            // Mark package welcome slide if it exists, but keep it in wine flow
            if (wine?.position === 1 && sortedWineSlides[0]) {
                const firstSlide = sortedWineSlides[0];
                if (firstSlide.payloadJson?.title?.includes('Welcome') ||
                    firstSlide.payloadJson?.title?.includes('Your Wine Tasting')) {
                    firstSlide._isPackageIntro = true;

                }
            }
        });

        // Sort each wine's slides using database section_type (now properly organized)
        const sortedSlidesByWine = Object.keys(wineSpecificSlidesByWine).reduce((acc, wineId) => {
            const wineSlides = wineSpecificSlidesByWine[wineId] || [];
            const wine = wines.find(w => w.id === wineId);

            if (wineSlides.length === 0) {
                acc[wineId] = [];
                return acc;
            }

            // Separate slides by database section_type
            const introSlides = wineSlides.filter(slide => {
                const sectionType = slide.section_type || slide.payloadJson?.section_type;
                return sectionType === 'intro';
            }).sort((a, b) => a.position - b.position);

            const deepDiveSlides = wineSlides.filter(slide => {
                const sectionType = slide.section_type || slide.payloadJson?.section_type;
                return sectionType === 'deep_dive' || sectionType === 'tasting';
            }).sort((a, b) => a.position - b.position);

            const endingSlides = wineSlides.filter(slide => {
                const sectionType = slide.section_type || slide.payloadJson?.section_type;
                return sectionType === 'ending' || sectionType === 'conclusion';
            }).sort((a, b) => a.position - b.position);

            // Debug logging for ending slides
            if (wine && endingSlides.length === 0) {
                console.warn(`⚠️ No ending slides found for wine: ${wine.wineName}`, {
                    wineId: wine.id,
                    totalSlides: wineSlides.length,
                    sections: wineSlides.map(s => s.section_type || s.payloadJson?.section_type || 'unknown')
                });
            } else if (wine && endingSlides.length > 0) {
                // Found ending slides for wine
            }

            // Combine in proper order: Intro → Deep Dive → Ending
            acc[wineId] = [...introSlides, ...deepDiveSlides, ...endingSlides];
            return acc;
        }, {} as Record<string, any[]>);

        // Create final ordered slides array: Package slides first, then wine slides in order
        const wineSlides = wines
            .sort((a, b) => a.position - b.position)
            .flatMap(wine => sortedSlidesByWine[wine.id] || []);

        const slides = [...packageIntroSlides, ...wineSlides];

        // Debug: Log total slides and section breakdown

        // Define helper functions as function declarations for proper hoisting
        function getSlideSection(slide: any): string {
            // Use database section_type (now properly organized)
            return slide.section_type || slide.payloadJson?.section_type || 'intro';
        }

        // Helper function to check if current slide is the last slide of its section
        function isLastSlideOfSection(slideIndex: number, wineSlides: any[], currentSection: string, currentWineId?: string): boolean {
            const wineStartIndex = currentWineId ? slides.findIndex(s => s.packageWineId === currentWineId) : 0;
            const currentSlideInWine = slideIndex - wineStartIndex;

            // Find all slides in current section
            const sectionSlides = wineSlides.filter(slide => getSlideSection(slide) === currentSection);
            const lastSlideInSection = sectionSlides[sectionSlides.length - 1];
            const lastSlideIndexInWine = wineSlides.findIndex(s => s.id === lastSlideInSection?.id);

            const isLast = currentSlideInWine === lastSlideIndexInWine;

            // Section boundary check

            return isLast;
        }

        // Return all processed data
        return {
            slides,
            wines,
            sortedSlidesByWine,
            packageIntroSlides,
            getSlideSection,
            isLastSlideOfSection
        };
    }, [slidesData]); // Only recalculate when slidesData changes

    // Extract processed data
    const {
        slides,
        wines,
        sortedSlidesByWine,
        packageIntroSlides,
        getSlideSection,
        isLastSlideOfSection
    } = processedSlidesData;

    // Wine completion tracking function - defined as callback to follow Rules of Hooks
    const checkWineCompletion = useCallback((wineId: string): boolean => {
        if (!wineId || !slides || slides.length === 0) {
            return false;
        }

        try {
            // Get all question slides for this wine
            const wineQuestionSlides = slides.filter(slide =>
                slide.packageWineId === wineId && slide.type === 'question'
            );

            if (wineQuestionSlides.length === 0) {
                return false;
            }

            // Check if we have answers for all question slides (use local state, not server responses)
            const answeredQuestionSlides = wineQuestionSlides.filter(slide =>
                answers[slide.id] !== undefined && answers[slide.id] !== null
            );
            const allQuestionsAnswered = wineQuestionSlides.length === answeredQuestionSlides.length;

            return allQuestionsAnswered;
        } catch (error) {
            console.error('Error checking wine completion:', error);
            return false;
        }
    }, [slides, answers, responses]);

    // Helper function to check if current slide is the last slide of current wine
    const isLastSlideOfCurrentWine = useCallback((slideIndex: number, currentWineId?: string): boolean => {
        if (!slides || slideIndex < 0 || slideIndex >= slides.length || !currentWineId) {
            return false;
        }

        // Find all slides for current wine
        const wineSlides = slides.filter(slide => slide.packageWineId === currentWineId);
        if (wineSlides.length === 0) return false;

        // Get the last slide of this wine
        const lastWineSlide = wineSlides[wineSlides.length - 1];
        const lastWineSlideIndex = slides.findIndex(slide => slide.id === lastWineSlide.id);

        const isLast = slideIndex === lastWineSlideIndex;

        return isLast;
    }, [slides]);

    // Helper function to check if navigating to next slide would leave current wine
    const isNavigatingToNextWine = useCallback((currentIndex: number): boolean => {
        if (!slides || currentIndex < 0 || currentIndex >= slides.length - 1) {
            return false;
        }

        const currentSlideWineId = slides[currentIndex]?.packageWineId;
        const nextSlideWineId = slides[currentIndex + 1]?.packageWineId;

        const isLeavingWine = currentSlideWineId && nextSlideWineId && currentSlideWineId !== nextSlideWineId;

        return isLeavingWine;
    }, [slides]);

    // Helper function to determine if we should show timer/results
    const shouldShowWineCompletionTimer = useCallback((): boolean => {
        // Always show wine completion timer and results
        return true;
    }, []);

    // Prefetch upcoming media when slide changes or slides are loaded
    useEffect(() => {
        if (slides && slides.length > 0 && currentSlideIndex >= 0) {
            // More aggressive prefetching for mobile audio - look ahead 3 slides
            const lookAhead = 3;
            prefetchUpcomingSlides(slides, currentSlideIndex, lookAhead).catch(err => {
                console.warn('Media prefetch failed:', err);
            });
        }
    }, [slides, currentSlideIndex]);

    // Also prefetch when slides are first loaded
    useEffect(() => {
        if (slides && slides.length > 0) {
            // Prefetch the first few slides immediately
            prefetchUpcomingSlides(slides, -1, 3).catch(err => {
                console.warn('Initial media prefetch failed:', err);
            });
        }
    }, [slides]);

    // Update completed slides when we have both responses and processed slides
    useEffect(() => {
        if (responses && responses.length > 0 && slides.length > 0) {
            const previousAnswers: Record<string, any> = {};
            responses.forEach((response: any) => {
                previousAnswers[response.slideId] = response.answerJson;
            });

            const completedIndices = slides
                .map((slide, index) => previousAnswers[slide.id] ? index : null)
                .filter(index => index !== null) as number[];
            setCompletedSlides(completedIndices);
        }
    }, [responses, slides]);

    // Handle answer changes
    const handleAnswerChange = async (slideId: string, answer: any) => {
        // Update answers state immediately for UI responsiveness
        setAnswers(prev => ({...prev, [slideId]: answer}));

        // Save response in background without blocking UI
        if (participantId && participant) {
            setIsSaving(true);
            try {
                await saveResponse(participantId, slideId, answer);
                // Set saving to false immediately after save completes
                setIsSaving(false);
            } catch (error) {
                console.error('Error saving response:', error);
                setIsSaving(false);
            }
        } else {
            console.warn('[TASTING_SESSION] Cannot save response - missing participant data:', {
                participantId,
                participant
            });
        }
    };

    // Clean up corrupted scale data when both responses and slides are available
    useEffect(() => {
        if (responses && responses.length > 0 && slides.length > 0) {
            let corruptedCount = 0;

            responses.forEach((response: any) => {
                const slide = slides.find(s => s.id === response.slideId);

                // If this is a scale question, validate the data
                if (slide && (slide.type === 'question' || slide.genericQuestions?.format === 'scale')) {
                    const isGenericScale = slide.genericQuestions?.format === 'scale';
                    const isLegacyScale = slide.payloadJson?.questionType === 'scale' || slide.payloadJson?.question_type === 'scale';

                    if (isGenericScale || isLegacyScale) {
                        let scaleMin, scaleMax;

                        if (isGenericScale) {
                            scaleMin = slide.genericQuestions.config?.scaleMin || 1;
                            scaleMax = slide.genericQuestions.config?.scaleMax || 10;
                        } else {
                            scaleMin = slide.payloadJson?.scale_min || slide.payloadJson?.scaleMin || 1;
                            scaleMax = slide.payloadJson?.scale_max || slide.payloadJson?.scaleMax || 10;
                        }

                        // Check if we need to correct the value
                        const originalValue = response.answerJson;
                        if (typeof originalValue === 'number' && (originalValue < scaleMin || originalValue > scaleMax)) {
                            const cleanedValue = Math.max(scaleMin, Math.min(scaleMax, originalValue));
                            corruptedCount++;
                            console.warn(`🔧 Cleaned corrupted scale data for slide ${response.slideId}: ${originalValue} → ${cleanedValue}`);

                            // Save the corrected value
                            setTimeout(() => {
                                handleAnswerChange(response.slideId, cleanedValue);
                            }, 100);
                        }
                    }
                }
            });

            if (corruptedCount > 0) {
                console.warn(`🚨 Found and cleaned ${corruptedCount} corrupted scale responses`);
            }
        }
    }, [responses, slides]);

    // CRITICAL STATE CALCULATION - moved before early returns for hooks consistency
    const currentSlide = slides && slides[currentSlideIndex] ? slides[currentSlideIndex] : null;

    // Reset wine completion status when changing wines (simplified logic)
    useEffect(() => {
        if (!currentSlide || !sessionId || !participantId || !slides || slides.length === 0) return;

        const currentWineId = currentSlide.packageWineId;
        if (!currentWineId) {
            setCurrentWineCompletionStatus(prev => ({
                ...prev,
                wineId: null,
                isParticipantFinished: false,
                showingCompletionStatus: false,
                hasTriggeredProcessing: false,
                isBlocking: false,
                showingAverages: false,
                averagesData: null
            }));
            return;
        }

        // Only reset status when changing to a different wine (don't trigger blocking here)
        setCurrentWineCompletionStatus(prev => {
            if (prev.wineId !== currentWineId) {
                return {
                    wineId: currentWineId,
                    isParticipantFinished: false,
                    showingCompletionStatus: false,
                    hasTriggeredProcessing: false,
                    isBlocking: false,
                    showingAverages: false,
                    averagesData: null,
                    isLoadingAverages: false
                };
            }
            return prev;
        });

    }, [currentSlide?.packageWineId, sessionId, participantId, slides]);

    // Handle wine completion timer expiry
    const handleWineCompletionTimerExpired = () => {
        const wineId = currentWineCompletionStatus.wineId;

        // Unblock navigation and hide timer, show loading state
        setCurrentWineCompletionStatus(prev => ({
            ...prev,
            showingCompletionStatus: false,
            isBlocking: false,
            isLoadingAverages: true // Show loading state while calculating averages
        }));

        // Reset timer and skip button for next wine
        setBlockingTimer(120);
        setShowSkipButton(false);

        if (wineId && sessionId) {
            // Trigger sentiment analysis and averages calculation immediately
            sentimentAnalysisMutation.mutate({sessionId, wineId});

            setTimeout(() => {
                averageCalculationMutation.mutate({sessionId, wineId});
            }, 500);
        }
    };

    // Timer countdown for blocking wine completion screen
    useEffect(() => {
        if (!currentWineCompletionStatus.isBlocking) {
            setBlockingTimer(120); // Reset timer when not blocking
            setShowSkipButton(false); // Reset skip button visibility
            return;
        }

        const interval = setInterval(() => {
            setBlockingTimer((prev) => {
                if (prev <= 1) {
                    // Timer expired, show skip button but don't auto-trigger processing
                    setShowSkipButton(true);
                    // Don't call handleWineCompletionTimerExpired() here - wait for user to click skip
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [currentWineCompletionStatus.isBlocking, currentWineCompletionStatus.wineId, handleWineCompletionTimerExpired]);

    // Format timer display
    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle completion of all participants
    const handleWineCompletionAllCompleted = useCallback(() => {
        const wineId = currentWineCompletionStatus.wineId;

        if (wineId && sessionId) {
            // Directly trigger Group Results when all non-host participants are done
            // This allows the session to continue even if the host hasn't finished
            setCurrentWineCompletionStatus(prev => ({
                ...prev,
                hasTriggeredProcessing: true,
                isBlocking: false,
                isLoadingAverages: true // Show loading state while calculating averages
            }));

            // Reset timer and skip button since we're proceeding automatically
            setBlockingTimer(120);
            setShowSkipButton(false);

            // Trigger sentiment analysis and averages calculation immediately
            sentimentAnalysisMutation.mutate({sessionId, wineId});

            setTimeout(() => {
                averageCalculationMutation.mutate({sessionId, wineId});
            }, 500);
        }
    }, [sessionId, currentWineCompletionStatus.wineId, sentimentAnalysisMutation, averageCalculationMutation]);

    // Step 5: Wine completion polling - Check if all participants have finished while timer is running
    useEffect(() => {
        // Only start polling when blocking starts for the first time
        if (!sessionId || !currentWineCompletionStatus.wineId || !currentWineCompletionStatus.isBlocking || currentWineCompletionStatus.hasTriggeredProcessing) {
            return;
        }

        const wineId = currentWineCompletionStatus.wineId;

        // Capture mutations at the start to avoid stale references
        const currentSentimentMutation = sentimentAnalysisMutation;
        const currentAverageMutation = averageCalculationMutation;

        const pollInterval = setInterval(async () => {
            try {
                // Check completion status for all participants
                const response = await apiRequest('GET', `/api/sessions/${sessionId}/wines/${wineId}/completion-status`, null);
                const completionData = await response.json();

                // Check if all non-host participants have completed their questions
                if (completionData.allParticipantsCompleted || completionData.allNonHostParticipantsCompleted) {
                    // Clear the polling interval
                    clearInterval(pollInterval);

                    // Directly trigger Group Results when all non-host participants are done
                    setCurrentWineCompletionStatus(prev => ({
                        ...prev,
                        hasTriggeredProcessing: true,
                        isBlocking: false,
                        isLoadingAverages: true // Show loading state while calculating averages
                    }));

                    // Reset timer and skip button since we're proceeding automatically
                    setBlockingTimer(120);
                    setShowSkipButton(false);

                    // Trigger sentiment analysis and averages calculation immediately
                    currentSentimentMutation.mutate({sessionId, wineId});

                    setTimeout(() => {
                        currentAverageMutation.mutate({sessionId, wineId});
                    }, 500);
                }
            } catch (error) {
                console.error('Error polling wine completion status:', error);
                // Continue polling despite errors
            }
        }, 15000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [sessionId, currentWineCompletionStatus.wineId, currentWineCompletionStatus.isBlocking]);

    // Step 3: Auto-trigger sentiment analysis and averages when blocking starts
    useEffect(() => {
        if (!sessionId || !currentWineCompletionStatus.wineId || !currentWineCompletionStatus.isBlocking || currentWineCompletionStatus.hasTriggeredProcessing) {
            return;
        }

        // Only trigger when blocking starts for the first time
        const wineId = currentWineCompletionStatus.wineId;

        // Mark as triggered immediately to prevent multiple calls
        setCurrentWineCompletionStatus(prev => ({
            ...prev,
            hasTriggeredProcessing: true
        }));

        // Debounce to prevent multiple triggers
        const timeoutId = setTimeout(() => {
            sentimentAnalysisMutation.mutate({sessionId, wineId});

            // Step 4: Also trigger average calculation after sentiment analysis
            setTimeout(() => {
                averageCalculationMutation.mutate({sessionId, wineId});
            }, 500); // Small delay after sentiment analysis
        }, 1000); // 1 second delay to ensure responses are saved

        return () => clearTimeout(timeoutId);
    }, [sessionId, currentWineCompletionStatus.wineId, currentWineCompletionStatus.isBlocking, currentWineCompletionStatus.hasTriggeredProcessing, sentimentAnalysisMutation, averageCalculationMutation]);

    if (sessionDetailsLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
                <motion.div
                    initial={{opacity: 0, scale: 0.9}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.3}}
                    className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl max-w-md w-full text-center"
                >
                    <Wine className="w-16 h-16 mx-auto mb-4 text-purple-300"/>
                    <h2 className="text-2xl font-semibold text-white mb-2">Preparing Your Wine Journey</h2>
                    <p className="text-purple-200 mb-6">Loading tasting experience...</p>
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!currentSession) {
        return (
            <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
                <h2 className="text-2xl font-semibold mb-2">Session Not Found</h2>
                <p className="text-purple-200 text-center">The session you're looking for doesn't exist or has
                    expired.</p>
            </div>
        );
    }

    // Check if participant exists after loading
    if (participantId && !sessionDetailsLoading && !participant && participantError) {
        console.error('[TASTING_SESSION] Participant not found, redirecting to join page');
        // Redirect to session join page
        setTimeout(() => {
            setLocation(`/session/${currentSession.packageCode || sessionId}`);
        }, 2000);

        return (
            <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
                <h2 className="text-2xl font-semibold mb-2">Participant Not Found</h2>
                <p className="text-purple-200 text-center mb-4">Your participant record wasn't found. Redirecting to
                    join page...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
        );
    }

    // Handle session status
    if (currentSession.status === 'waiting') {
        return (
            <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
                <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-purple-300 animate-pulse"/>
                    <h2 className="text-2xl font-semibold mb-2">Waiting for Session to Start</h2>
                    <p className="text-purple-200">The host will begin the tasting shortly...</p>
                </div>
            </div>
        );
    }

    if (currentSession.status === 'paused') {
        return (
            <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
                <div className="text-center">
                    <Pause className="w-16 h-16 mx-auto mb-4 text-yellow-300"/>
                    <h2 className="text-2xl font-semibold mb-2">Session Paused</h2>
                    <p className="text-purple-200">Please wait while the host resumes the session...</p>
                </div>
            </div>
        );
    }

    if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
                <h2 className="text-2xl font-semibold mb-2">No Content Available</h2>
                <p className="text-purple-200 text-center">This session doesn't have any slides configured yet.</p>
            </div>
        );
    }

    // Prevent rendering if slides aren't loaded yet or if we're in an invalid state
    if (!slides || slides.length === 0) {
        return <LoadingOverlay isVisible={true} message="Loading slides..."/>;
    }

    // Handle case where currentSlideIndex is out of bounds
    if (currentSlideIndex >= slides.length || currentSlideIndex < 0) {
        // Reset to valid index instead of showing loading
        setCurrentSlideIndex(Math.min(currentSlideIndex, slides.length - 1));
        return <LoadingOverlay isVisible={true} message="Loading..."/>;
    }

    const currentWine = currentSlide && wines ? wines.find(w => w.id === currentSlide.packageWineId) : null;
    const isPackageLevelSlide = currentSlide && currentSlide.packageId && !currentSlide.packageWineId;

    // Calculate section progress based on current wine's slides only (or package context for package-level slides)
    const currentWineSlides = currentWine ? sortedSlidesByWine[currentWine.id] || [] : (isPackageLevelSlide ? packageIntroSlides : []);
    const currentWineStartIndex = currentWine ? slides.findIndex(s => s.packageWineId === currentWine.id) : (isPackageLevelSlide ? 0 : 0);
    const currentSlideInWine = currentSlideIndex - currentWineStartIndex;

    const sectionNames = ['Introduction', 'Deep Dive', 'Final Thoughts'];
    const sections = sectionNames.map((sectionName) => {
        // Find section slides within current wine using computed sections
        const sectionSlides = currentWineSlides.filter(slide => {
            const computedSection = getSlideSection(slide);
            if (sectionName === 'Introduction') return computedSection === 'intro';
            if (sectionName === 'Deep Dive') return computedSection === 'deep_dive' || computedSection === 'tasting';
            if (sectionName === 'Final Thoughts') return computedSection === 'ending' || computedSection === 'conclusion';
            return false;
        });

        if (sectionSlides.length === 0) {
            // Fallback: divide current wine's slides into three equal sections
            const totalWineSlides = currentWineSlides.length;
            const slidesPerSection = Math.ceil(totalWineSlides / 3);
            let sectionIndex = 0;
            if (sectionName === 'Deep Dive') sectionIndex = 1;
            if (sectionName === 'Final Thoughts') sectionIndex = 2;

            const startIndex = sectionIndex * slidesPerSection;
            const endIndex = Math.min(startIndex + slidesPerSection, totalWineSlides);
            const isActive = currentSlideInWine >= startIndex && currentSlideInWine < endIndex;
            const isCompleted = currentSlideInWine >= endIndex;
            const progress = isCompleted ? 100 : isActive ? ((currentSlideInWine - startIndex + 1) / slidesPerSection) * 100 : 0;

            return {
                name: sectionName,
                progress: Math.max(0, Math.min(100, progress)),
                isActive,
                isCompleted
            };
        }

        // Find section boundaries within current wine
        const firstSlideIndex = currentWineSlides.findIndex(s => sectionSlides.includes(s));
        const lastSlideIndex = currentWineSlides.findIndex(s => s === sectionSlides[sectionSlides.length - 1]);
        const isActive = currentSlideInWine >= firstSlideIndex && currentSlideInWine <= lastSlideIndex;

        // Section is only completed when we've FINISHED the last slide (not just reached it)
        const isCompleted = currentSlideInWine > lastSlideIndex ||
            (currentSlideInWine === lastSlideIndex && completedSlides.includes(slides.findIndex(s => s.id === currentWineSlides[lastSlideIndex]?.id)));

        // Progress calculation: only show 100% when section is fully completed
        let progress = 0;
        if (isCompleted) {
            progress = 100;
        } else if (isActive) {
            // Show incremental progress within the section, but never reach 100% until completed
            const progressInSection = (currentSlideInWine - firstSlideIndex) / sectionSlides.length;
            progress = Math.min(95, progressInSection * 100); // Cap at 95% until completion
        }

        return {
            name: sectionName,
            progress: Math.max(0, Math.min(100, progress)),
            isActive,
            isCompleted
        };
    });

    // Fetch comparable questions and skip completion if none exist
    const checkComparableQuestionsAndMaybeSkip = async (sessionId: string, wineId: string) => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/wines/${wineId}/comparable-questions`);
            const data = await res.json();
            if (!data.questions || data.questions.length === 0) {
                // No comparable questions, skip completion logic
                handleAveragesComplete();
                return;
            }
            // Otherwise, proceed with completion logic
            handleCompletionWithQuestions(data.questions);
        } catch (error) {
            console.error("Failed to fetch comparable questions:", error);
            // Optionally handle error or skip
            skipCompletion();
        }
    };

    const skipCompletion = () => {
        // Skip the wine completion flow and go directly to next wine
        setCurrentWineCompletionStatus(prev => ({
            ...prev,
            wineId: null,
            isParticipantFinished: false,
            showingCompletionStatus: false,
            hasTriggeredProcessing: false,
            isBlocking: false,
            showingAverages: false,
            averagesData: null,
            isLoadingAverages: false
        }));

        // Navigate to next wine directly
        const nextSlideIndex = currentSlideIndex + 1;
        if (nextSlideIndex < slides.length) {
            setCurrentSlideIndex(nextSlideIndex);
            setCompletedSlides(prev => [...prev, currentSlideIndex]);
        } else {
            // End of session
            handleComplete();
        }
    };

    const handleCompletionWithQuestions = (questions: any[]) => {
        // Proceed with the normal wine completion flow
        const currentWineId = currentWine?.id;
        if (currentWineId && sessionId) {
            // Set loading state while checking
            setIsCheckingCompletion(true);

            // Check completion status immediately
            apiRequest('GET', `/api/sessions/${sessionId}/wines/${currentWineId}/completion-status`, {})
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();

                        if (data && (data.allParticipantsCompleted || data.allNonHostParticipantsCompleted)) {
                            // Skip timer, show averages immediately
                            setCurrentWineCompletionStatus(prev => ({
                                ...prev,
                                wineId: currentWineId,
                                isParticipantFinished: true,
                                hasTriggeredProcessing: false,
                                isBlocking: false,
                                showingAverages: true,
                                isLoadingAverages: true
                            }));
                            // Trigger averages calculation
                            if (sessionId && currentWineId) {
                                averageCalculationMutation.mutate({sessionId, wineId: currentWineId});
                            }
                        } else {
                            // Not all completed, show timer with polling
                            setCurrentWineCompletionStatus(prev => ({
                                ...prev,
                                wineId: currentWineId,
                                isParticipantFinished: true,
                                hasTriggeredProcessing: false,
                                isBlocking: true, // Block navigation and show timer modal
                                isLoadingAverages: false
                            }));
                        }
                    } else {
                        // API call failed, show timer as fallback
                        setCurrentWineCompletionStatus(prev => ({
                            ...prev,
                            wineId: currentWineId,
                            isParticipantFinished: true,
                            hasTriggeredProcessing: false,
                            isBlocking: true,
                            isLoadingAverages: false
                        }));
                    }
                })
                .catch((error) => {
                    console.error('❌ Error checking completion status:', error);
                    // If the API call fails, show timer as fallback
                    setCurrentWineCompletionStatus(prev => ({
                        ...prev,
                        wineId: currentWineId,
                        isParticipantFinished: true,
                        hasTriggeredProcessing: false,
                        isBlocking: true,
                        isLoadingAverages: false
                    }));
                })
                .finally(() => {
                    console.log('🏁 Finished checking completion status');
                    setIsCheckingCompletion(false);
                });
        }
    };


    // Navigation functions
    const goToNextSlide = async () => {
        const currentWineId = currentWine?.id;

        // Enhanced validation with detailed logging
        if (!slides || slides.length === 0) {
            return;
        }

        if (currentSlideIndex < 0 || currentSlideIndex >= slides.length) {
            return;
        }

        // Fix the condition: check if we would be going beyond the last slide
        if (currentSlideIndex >= slides.length - 1) {
            // On last slide, check comparable questions before completion
            if (sessionId && currentWineId) {
                await checkComparableQuestionsAndMaybeSkip(sessionId, currentWineId);
            } else {
                handleComplete();
            }
            return; // Prevent further navigation until check completes
        }

        // CRITICAL: Block navigation if wine completion is blocking OR if showing averages
        if (currentWineCompletionStatus.isBlocking || currentWineCompletionStatus.showingAverages) {
            return;
        }

        // NEW LOGIC: Check for wine completion at the right time
        // Only trigger wine completion when we're actually leaving a wine AND all questions are answered
        // Case 1: We're at the last slide of the current wine AND all questions are completed
        // Case 2: We're navigating to a different wine AND all questions for current wine are completed
        const shouldCheckWineCompletion = currentWineId && (
            (isLastSlideOfCurrentWine(currentSlideIndex, currentWineId) && checkWineCompletion(currentWineId)) ||
            (isNavigatingToNextWine(currentSlideIndex) && checkWineCompletion(currentWineId))
        );

        if (shouldCheckWineCompletion) {
            const isWineComplete = checkWineCompletion(currentWineId);

            // Only proceed with wine completion if ALL questions have been answered
            if (isWineComplete && !currentWineCompletionStatus.hasTriggeredProcessing && !currentWineCompletionStatus.showingAverages) {
                // FIRST: Check for comparable questions before proceeding with completion flow
                if (sessionId && currentWineId) {
                    await checkComparableQuestionsAndMaybeSkip(sessionId, currentWineId);
                } else {
                    console.log('🎯 No sessionId or currentWineId, calling handleComplete directly');
                    handleComplete();
                }

                return; // Block navigation until check completes
            }
        }

        if (currentSlideIndex < slides.length - 1) {
            const nextSlide = slides[currentSlideIndex + 1];
            const nextWine = nextSlide && wines ? wines.find(w => w.id === nextSlide.packageWineId) : null;

            const currentSection = getSlideSection(currentSlide);
            const nextSection = getSlideSection(nextSlide);

            // Check if we're leaving package intro or transitioning to a new wine
            const isLeavingPackageIntro = currentSlide?.payloadJson?.is_package_intro === true;

            // Check if the next slide is a transition slide
            const nextSlideIsTransition = nextSlide?.type === 'transition';

            if (((currentWine && nextWine && currentWine.id !== nextWine.id) || isLeavingPackageIntro) && !nextSlideIsTransition) {
                // Only show automatic transition if there's no manual transition slide
                setIsTransitioningSection(true);
                setTransitionSectionName(nextWine.wineName);
                triggerHaptic('success');

                // Show wine transition for 2.5 seconds, then show wine introduction
                setTimeout(() => {
                    const nextWinePosition = nextWine.position; // Use the actual position from the wine object
                    const isFirstWine = nextWinePosition === 1;

                    setIsTransitioningSection(false);

                    // Always show wine introduction when leaving package intro or transitioning wines
                    setWineIntroductionData({
                        wine: {
                            wineName: nextWine.wineName,
                            wineDescription: nextWine.wineDescription,
                            wineImageUrl: nextWine.wineImageUrl,
                            position: nextWinePosition
                        },
                        isFirstWine
                    });
                    setShowingWineIntroduction(true);
                }, 2500); // 2.5 seconds to show the transition properly
            }
                // Check if we're transitioning to a new section within the same wine
            // ONLY trigger section transition when completing the LAST slide of current section
            else if (currentWine && nextWine && currentWine.id === nextWine.id &&
                currentSection !== nextSection &&
                isLastSlideOfSection(currentSlideIndex, currentWineSlides, currentSection, currentWine.id) &&
                !nextSlideIsTransition) {

                setSectionTransitionData({
                    fromSection: currentSection,
                    toSection: nextSection,
                    wineName: currentWine.wineName
                });
                setShowSectionTransition(true);
                triggerHaptic('success');
            } else {

                // Force blur before navigation
                const activeElement = document.activeElement;
                if (activeElement instanceof HTMLElement) {
                    // Force blur - critical for text response navigation bug
                    activeElement.blur();
                }

                // Standard navigation for all slide types
                setIsNavigating(true);
                triggerHaptic('success');

                // Use consistent delay for all question types to ensure saves complete
                const navigationDelay = TRANSITION_DURATIONS.slideNavigation;

                setTimeout(() => {
                    setCurrentSlideIndex(currentSlideIndex + 1);
                    setCompletedSlides(prev => [...prev, currentSlideIndex]);
                    setIsNavigating(false);
                }, navigationDelay);
            }
        }
    };

    const handleSectionTransitionComplete = () => {
        setShowSectionTransition(false);
        // Add bounds checking to prevent accessing undefined slides
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
            setCompletedSlides(prev => [...prev, currentSlideIndex]);
        } else {
            // End of slides reached, complete the session
            handleComplete();
        }
        setSectionTransitionData(null);
    };

    const handleWineIntroductionComplete = () => {
        setShowingWineIntroduction(false);
        setWineIntroductionData(null);
        // Add bounds checking to prevent accessing undefined slides
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
            setCompletedSlides(prev => [...prev, currentSlideIndex]);
        } else {
            // End of slides reached, complete the session
            handleComplete();
        }
    };

    const goToPreviousSlide = () => {
        if (currentSlideIndex > 0) {
            setIsNavigating(true);
            triggerHaptic('selection');

            setTimeout(() => {
                setCurrentSlideIndex(currentSlideIndex - 1);
                setCompletedSlides(prev => prev.filter(i => i !== currentSlideIndex));
                setIsNavigating(false);
            }, TRANSITION_DURATIONS.slideNavigation);
        }
    };

    const jumpToSlide = (slideIndex: number) => {
        if (slideIndex !== currentSlideIndex) {
            setIsNavigating(true);
            triggerHaptic('selection');

            setTimeout(() => {
                setCurrentSlideIndex(slideIndex);
                setIsNavigating(false);
            }, TRANSITION_DURATIONS.slideJump);
        }
        setSidebarOpen(false);
    };

    // Helper function to safely extract scale min/max values with validation
    const extractScaleRange = (payloadJson: any): { scaleMin: number; scaleMax: number } => {
        let scaleMin = Number(payloadJson?.scale_min || payloadJson?.scaleMin || 1);
        let scaleMax = Number(payloadJson?.scale_max || payloadJson?.scaleMax || 10);

        // Validate and fix invalid ranges
        if (isNaN(scaleMin) || scaleMin < 1) scaleMin = 1;
        if (isNaN(scaleMax) || scaleMax < scaleMin + 1) scaleMax = scaleMin + 9;
        if (scaleMin > scaleMax) [scaleMin, scaleMax] = [scaleMax, scaleMin];

        return {scaleMin, scaleMax};
    };

    // Helper function to extract numeric value from potentially complex answer objects
    const extractScaleValue = (answer: any, scaleMin: number, scaleMax: number): number => {
        // Fix invalid scale ranges (defense against corrupted data)
        if (scaleMin > scaleMax) {
            console.warn('Invalid scale range detected, fixing:', {scaleMin, scaleMax});
            [scaleMin, scaleMax] = [scaleMax, scaleMin]; // Swap values
        }

        if (answer === null || answer === undefined) {
            return Math.floor((scaleMin + scaleMax) / 2); // Default to middle value
        }

        let numericValue: number;
        const originalAnswer = answer; // Store for debugging

        // Handle different answer formats
        if (typeof answer === 'number') {
            numericValue = answer;
        } else if (typeof answer === 'object' && answer !== null) {
            // Check for common object structures
            if (typeof answer.value === 'number') {
                numericValue = answer.value;
            } else if (typeof answer.selected === 'number') {
                numericValue = answer.selected;
            } else if (typeof answer.rating === 'number') {
                numericValue = answer.rating;
            } else if (typeof answer.score === 'number') {
                numericValue = answer.score;
            } else {
                // Try to extract first numeric value from object
                const values = Object.values(answer).filter(v => typeof v === 'number');
                numericValue = values.length > 0 ? values[0] as number : Math.floor((scaleMin + scaleMax) / 2);
            }
        } else if (typeof answer === 'string') {
            // Try to parse string as number
            const parsed = parseFloat(answer);
            numericValue = isNaN(parsed) ? Math.floor((scaleMin + scaleMax) / 2) : parsed;
        } else {
            // Fallback to default
            numericValue = Math.floor((scaleMin + scaleMax) / 2);
        }

        // CRITICAL: Always clamp to valid range to prevent UI overflow
        const originalValue = numericValue;
        numericValue = Math.max(scaleMin, Math.min(scaleMax, numericValue));

        // Round to nearest integer for cleaner display
        return Math.round(numericValue);
    };

    // Step 5: Timer and Skip Option handlers
    const processTextAnswersAndShowAverages = (wineId: string, trigger: string) => {
        if (!sessionId) {
            console.error('Cannot process answers - sessionId is undefined');
            return;
        }

        // Mark as triggered to prevent auto-processing and unblock navigation
        setCurrentWineCompletionStatus(prev => ({
            ...prev,
            hasTriggeredProcessing: true,
            isBlocking: false, // Unblock navigation after processing
            isLoadingAverages: true // Show loading state while calculating averages
        }));

        // Step 3: Perform sentiment analysis on text responses (optional, non-blocking)
        sentimentAnalysisMutation.mutate({sessionId, wineId});

        // Step 4: Calculate and display averages immediately (don't wait for sentiment)
        averageCalculationMutation.mutate({sessionId, wineId});
    };

    const handleWineCompletionSkip = () => {
        const wineId = currentWineCompletionStatus.wineId;

        // Unblock navigation and hide timer, but show loading state for Group Results
        setCurrentWineCompletionStatus(prev => ({
            ...prev,
            showingCompletionStatus: false,
            isBlocking: false,
            isLoadingAverages: true // Show loading state while calculating averages
        }));

        // Reset timer and skip button for next wine
        setBlockingTimer(120);
        setShowSkipButton(false);

        if (wineId && sessionId) {
            // Trigger sentiment analysis and averages calculation immediately
            sentimentAnalysisMutation.mutate({sessionId, wineId});

            // Step 4: Also trigger average calculation after sentiment analysis
            setTimeout(() => {
                averageCalculationMutation.mutate({sessionId, wineId});
            }, 500); // Small delay after sentiment analysis
        } else {
            console.error('ERROR: Missing wineId or sessionId for Group Results');
        }
    };


    // Step 6: Handle completion of averages display and progress to next wine
    const handleAveragesComplete = () => {
        // Reset wine completion status for next wine
        setCurrentWineCompletionStatus({
            wineId: null,
            isParticipantFinished: false,
            showingCompletionStatus: false,
            hasTriggeredProcessing: false,
            isBlocking: false,
            showingAverages: false,
            averagesData: null,
            isLoadingAverages: false
        });

        // Check if we should show wine introduction when moving to next wine
        if (currentSlideIndex < slides.length - 1) {
            const nextSlide = slides[currentSlideIndex + 1];
            const nextWine = nextSlide && wines ? wines.find(w => w.id === nextSlide.packageWineId) : null;
            const currentWineId = currentSlide?.packageWineId;

            // If moving to a different wine, show wine introduction
            if (nextWine && currentWineId !== nextWine.id) {

                setWineIntroductionData({
                    wine: {
                        wineName: nextWine.wineName,
                        wineDescription: nextWine.wineDescription,
                        wineImageUrl: nextWine.wineImageUrl,
                        position: nextWine.position
                    },
                    isFirstWine: nextWine.position === 1
                });
                setShowingWineIntroduction(true);
            } else {
                // Same wine or no wine transition, just navigate normally
                setCurrentSlideIndex(currentSlideIndex + 1);
                setCompletedSlides(prev => [...prev, currentSlideIndex]);
            }
        } else {
            // End of session — show final congratulations screen instead of immediate navigation
            setShowFinalCongratulations(true);
            // End the session locally
            endSession();
        }
    };


    // Handle completion
    const handleComplete = async () => {
        triggerHaptic('success');
        const progress = 100;

        // End the session properly
        endSession();

        // Navigate to completion page using the actual session ID from currentSession
        const actualSessionId = currentSession?.id || sessionId;
        setLocation(`/completion/${actualSessionId}/${participantId}?progress=${progress}`);
    };

    // Render current slide content
    const renderSlideContent = () => {
        if (!currentSlide) {
            return (
                <div
                    className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center">
                    <p className="text-white">No slide data available</p>
                    <p className="text-white/60 text-sm mt-2">Slide index: {currentSlideIndex}</p>
                </div>
            );
        }

        switch (currentSlide.type) {
            case 'interlude':
                const isPackageIntro = currentSlide.payloadJson.is_package_intro;
                const isWineIntro = currentSlide.payloadJson.is_wine_intro;
                const wineImage = currentSlide.payloadJson.wine_image || currentSlide.payloadJson.wine_image_url;

                return (
                    <motion.div
                        key={`interlude-${currentSlide.id}`}
                        initial={{opacity: 0, y: isPackageIntro ? 40 : 20, scale: isPackageIntro ? 0.9 : 1}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        transition={isPackageIntro ? TRANSITION_DURATIONS.packageIntroAnimation : undefined}
                        className="bg-gradient-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl text-center"
                    >
                        {isPackageIntro && (
                            <div className="mb-3 sm:mb-4">
                                {currentSlide.payloadJson.package_image || currentSlide.payloadJson.background_image ? (
                                    <img
                                        src={currentSlide.payloadJson.package_image || currentSlide.payloadJson.background_image}
                                        alt={currentSlide.payloadJson.package_name || "Package"}
                                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mx-auto rounded-xl object-cover shadow-2xl border-2 sm:border-4 border-white/20"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling as HTMLDivElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full items-center justify-center"
                                    style={{display: 'none'}}>
                                    <Wine className="w-6 h-6 sm:w-8 sm:h-8 text-white"/>
                                </div>
                            </div>
                        )}

                        {isWineIntro && wineImage && (
                            <div className="mb-3 sm:mb-4">
                                <img
                                    src={wineImage}
                                    alt={currentSlide.payloadJson.wine_name || "Wine"}
                                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto rounded-lg object-cover shadow-lg"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">
                            <DynamicTextRenderer text={currentSlide.payloadJson.title}/>
                        </h2>

                        {currentSlide.payloadJson.description && (
                            <p className="text-white/80 text-sm sm:text-base lg:text-lg leading-relaxed mb-3 sm:mb-4 max-w-2xl mx-auto">
                                <DynamicTextRenderer text={currentSlide.payloadJson.description}/>
                            </p>
                        )}

                        {isWineIntro && (
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4 text-xs sm:text-sm">
                                {currentSlide.payloadJson.wine_type && (
                                    <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                                        <p className="text-white/60 text-[10px] sm:text-xs">Type</p>
                                        <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_type}</p>
                                    </div>
                                )}
                                {currentSlide.payloadJson.wine_region && (
                                    <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                                        <p className="text-white/60 text-[10px] sm:text-xs">Region</p>
                                        <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_region}</p>
                                    </div>
                                )}
                                {currentSlide.payloadJson.wine_vintage && (
                                    <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                                        <p className="text-white/60 text-[10px] sm:text-xs">Vintage</p>
                                        <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_vintage}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                );

            case 'video_message':
                return (
                    <VideoMessageSlide
                        payload={currentSlide.payloadJson as VideoMessagePayload}
                        key={`video-${currentSlide.id}`}
                    />
                );

            case 'audio_message':
                return (
                    <AudioMessageSlide
                        payload={currentSlide.payloadJson as AudioMessagePayload}
                        key={`audio-${currentSlide.id}`}
                    />
                );

            case 'question':
                // Check for new generic_questions format first
                if (currentSlide.genericQuestions) {
                    const gq = currentSlide.genericQuestions;

                    switch (gq.format) {
                        case 'multiple_choice':
                            return (
                                <MultipleChoiceQuestion
                                    question={{
                                        title: gq.config.title,
                                        description: gq.config.description || '',
                                        category: gq.metadata?.category || 'Question',
                                        options: gq.config.options || [],
                                        allow_multiple: gq.config.allowMultiple || false,
                                        allow_notes: gq.config.allowNotes || false
                                    }}
                                    value={answers[currentSlide.id] || {selected: [], notes: ''}}
                                    onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                                    disableNext={disableNextButton}
                                    setDisableNext={setDisableNextButton}
                                />
                            );

                        case 'scale':
                            const scaleMin = gq.config.scaleMin || 1;
                            const scaleMax = gq.config.scaleMax || 10;
                            return (
                                <ScaleQuestion
                                    question={{
                                        title: gq.config.title,
                                        description: gq.config.description || '',
                                        category: gq.metadata?.category || 'Scale',
                                        scale_min: scaleMin,
                                        scale_max: scaleMax,
                                        scale_labels: gq.config.scaleLabels || ['Low', 'High']
                                    }}
                                    value={extractScaleValue(answers[currentSlide.id], scaleMin, scaleMax)}
                                    onChange={(value) => {
                                        // Ensure value is always within valid range before saving
                                        const clampedValue = Math.max(scaleMin, Math.min(scaleMax, value));
                                        handleAnswerChange(currentSlide.id, clampedValue);
                                    }}
                                />
                            );

                        case 'text':
                            return (
                                <TextQuestion
                                    question={{
                                        title: gq.config.title,
                                        description: gq.config.description,
                                        placeholder: (gq.config as any).placeholder,
                                        maxLength: (gq.config as any).maxLength,
                                        minLength: (gq.config as any).minLength,
                                        rows: (gq.config as any).rows,
                                        category: gq.config.category
                                    }}
                                    value={answers[currentSlide.id] || ''}
                                    onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                                />
                            );

                        case 'boolean':
                            return (
                                <BooleanQuestion
                                    question={{
                                        title: gq.config.title,
                                        description: gq.config.description,
                                        category: gq.config.category,
                                        trueLabel: (gq.config as any).trueLabel,
                                        falseLabel: (gq.config as any).falseLabel,
                                        trueIcon: (gq.config as any).trueIcon,
                                        falseIcon: (gq.config as any).falseIcon
                                    }}
                                    value={answers[currentSlide.id] ?? null}
                                    onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                                    setDisableNext={setDisableNextButton}
                                />
                            );

                        case 'video_message':
                            return (
                                <VideoMessageSlide
                                    payload={{
                                        title: gq.config.title,
                                        description: gq.config.description,
                                        video_url: (gq.config as any).video_url,
                                        autoplay: (gq.config as any).autoplay || false,
                                        show_controls: (gq.config as any).controls !== false
                                    } as VideoMessagePayload}
                                    key={`video-legacy-${currentSlide.id}`}
                                />
                            );

                        case 'audio_message':
                            return (
                                <AudioMessageSlide
                                    payload={{
                                        title: gq.config.title,
                                        description: gq.config.description,
                                        audio_url: (gq.config as any).audio_url,
                                        autoplay: (gq.config as any).autoplay || false,
                                        show_controls: true
                                    } as AudioMessagePayload}
                                    key={`audio-legacy-${currentSlide.id}`}
                                />
                            );

                        default:
                            return (
                                <div
                                    className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        <DynamicTextRenderer text={gq.config.title}/>
                  </h3>
                  <p className="text-white/70 text-sm">
                    Unsupported question format: {gq.format}
                  </p>
                </div>
              );
          }
        }

        // Fallback to legacy payloadJson format
        const questionData = currentSlide.payloadJson;
        
        if (questionData.questionType === 'multiple_choice' || questionData.question_type === 'multiple_choice') {
          return (
            <MultipleChoiceQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Question',
                options: questionData.options || [],
                allow_multiple: questionData.allow_multiple || questionData.allowMultiple || false,
                allow_notes: questionData.allow_notes || questionData.allowNotes || false
              }}
              value={answers[currentSlide.id] || { selected: [], notes: '' }}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
              disableNext={disableNextButton}
              setDisableNext={setDisableNextButton}
            />
          );
        }

        if (questionData.questionType === 'scale' || questionData.question_type === 'scale') {
          const { scaleMin, scaleMax } = extractScaleRange(questionData);
          return (
            <ScaleQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Scale',
                scale_min: scaleMin,
                scale_max: scaleMax,
                scale_labels: questionData.scale_labels || questionData.scaleLabels || ['Low', 'High']
              }}
              value={extractScaleValue(answers[currentSlide.id], scaleMin, scaleMax)}
              onChange={(value) => {
                // Ensure value is always within valid range before saving
                const clampedValue = Math.max(scaleMin, Math.min(scaleMax, value));
                handleAnswerChange(currentSlide.id, clampedValue);
              }}
            />
          );
        }

        if (questionData.questionType === 'video_message' || questionData.question_type === 'video_message') {
          return (
            <VideoMessageSlide
              payload={{
                title: questionData.title || questionData.question || '',
                description: questionData.description || '',
                video_url: questionData.video_url || '',
                autoplay: questionData.autoplay || false,
                show_controls: questionData.controls !== false
              } as VideoMessagePayload}
              key={`video-legacy-${currentSlide.id}`}
            />
          );
        }

        if (questionData.questionType === 'text' || questionData.question_type === 'text' ||
            questionData.questionType === 'free_response' || questionData.question_type === 'free_response') {
          return (
            <TextQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                placeholder: questionData.placeholder || '',
                maxLength: questionData.maxLength || questionData.max_length || 500,
                minLength: questionData.minLength || questionData.min_length,
                rows: questionData.rows || 4,
                category: questionData.category || 'Text Response'
              }}
              value={answers[currentSlide.id] || ''}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        if (questionData.questionType === 'boolean' || questionData.question_type === 'boolean') {
          return (
            <BooleanQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Yes/No',
                trueLabel: questionData.trueLabel || questionData.true_label,
                falseLabel: questionData.falseLabel || questionData.false_label,
                trueIcon: questionData.trueIcon !== false,
                falseIcon: questionData.falseIcon !== false
              }}
              value={answers[currentSlide.id] ?? null}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
              setDisableNext={setDisableNextButton}
            />
          );
        }

        if (questionData.questionType === 'audio_message' || questionData.question_type === 'audio_message') {
          return (
            <AudioMessageSlide
              payload={{
                title: questionData.title || questionData.question || '',
                description: questionData.description || '',
                audio_url: questionData.audio_url || '',
                autoplay: questionData.autoplay || false,
                show_controls: true
              } as AudioMessagePayload}
              key={`audio-legacy-${currentSlide.id}`}
            />
          );
        }

        // Enhanced fallback detection for questions that don't match standard patterns
        
        // Try to detect boolean questions by content analysis
        const title = questionData.title || questionData.question || '';
        const isLikelyBoolean = title.toLowerCase().includes('yes') || 
                              title.toLowerCase().includes('no') || 
                              title.toLowerCase().includes('true') || 
                              title.toLowerCase().includes('false') ||
                              (questionData.options && questionData.options.length === 2);
        
        if (isLikelyBoolean) {
          return (
            <BooleanQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Yes/No',
                trueLabel: questionData.trueLabel || questionData.true_label || 'Yes',
                falseLabel: questionData.falseLabel || questionData.false_label || 'No',
                trueIcon: questionData.trueIcon !== false,
                falseIcon: questionData.falseIcon !== false
              }}
              value={answers[currentSlide.id] ?? null}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
              setDisableNext={setDisableNextButton}
            />
          );
        }
        
        // Try to detect multiple choice by options array
        if (questionData.options && Array.isArray(questionData.options) && questionData.options.length > 2) {
          return (
            <MultipleChoiceQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Multiple Choice',
                options: questionData.options,
                allow_multiple: questionData.allow_multiple || questionData.allowMultiple || false,
                allow_notes: questionData.allow_notes || questionData.allowNotes || false
              }}
              value={answers[currentSlide.id] || { selected: [], notes: '' }}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
              setDisableNext={setDisableNextButton}
              disableNext={disableNextButton}
            />
          );
        }
        
        // Try to detect scale questions
        if (questionData.scale_min !== undefined || questionData.scaleMin !== undefined ||
            questionData.scale_max !== undefined || questionData.scaleMax !== undefined) {
          const { scaleMin, scaleMax } = extractScaleRange(questionData);
          return (
            <ScaleQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Scale',
                scale_min: scaleMin,
                scale_max: scaleMax,
                scale_labels: questionData.scale_labels || questionData.scaleLabels || ['Low', 'High']
              }}
              value={extractScaleValue(answers[currentSlide.id], scaleMin, scaleMax)}
              onChange={(value) => {
                const clampedValue = Math.max(scaleMin, Math.min(scaleMax, value));
                handleAnswerChange(currentSlide.id, clampedValue);
              }}
            />
          );
        }
        
        // Fallback to text question for any unidentified question
        return (
          <TextQuestion
            question={{
              title: title,
              description: questionData.description || '',
              placeholder: questionData.placeholder || 'Enter your response...',
              maxLength: questionData.maxLength || questionData.max_length || 500,
              minLength: questionData.minLength || questionData.min_length,
              rows: questionData.rows || 4,
              category: questionData.category || 'Response'
            }}
            value={answers[currentSlide.id] || ''}
            onChange={(value) => handleAnswerChange(currentSlide.id, value)}
          />
        );

      case 'transition':
        const transitionPayload = currentSlide.payloadJson as TransitionPayload;
        return (
          <TransitionSlide
            payload={transitionPayload}
            onContinue={goToNextSlide}
            autoAdvance={!transitionPayload.showContinueButton}
          />
        );

      default:
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center">
            <p className="text-white">Unknown slide type: {currentSlide.type}</p>
          </div>
        );
    }
  };

  // Wine introduction for 2nd, 3rd, etc. wines
  if (showingWineIntroduction && wineIntroductionData) {
    return (
      <WineIntroduction
        wine={wineIntroductionData.wine}
        isFirstWine={wineIntroductionData.isFirstWine}
        onContinue={handleWineIntroductionComplete}
      />
    );
  }

  // Wine transition overlay
  if (isTransitioningSection && currentWine) {
    const nextSlide = slides[currentSlideIndex + 1];
    const nextWine = nextSlide ? wines.find(w => w.id === nextSlide.packageWineId) : null;
    const isFromPackageIntro = currentSlide?.payloadJson?.is_package_intro === true;
    
    return (
      <WineTransition
        currentWine={{
          wineName: currentWine.wineName,
          wineDescription: currentWine.wineDescription || '',
          wineImageUrl: currentWine.wineImageUrl || '',
          position: isFromPackageIntro ? 0 : currentWine.position // Use 0 for package intro to hide wine number
        }}
        nextWine={nextWine ? {
          wineName: nextWine.wineName,
          wineDescription: nextWine.wineDescription || '',
          wineImageUrl: nextWine.wineImageUrl || '',
          position: nextWine.position // Use actual position from wine object
        } : undefined}
        sectionType={currentSlide?.section_type}
        onContinue={() => {
          // Add bounds checking to prevent accessing undefined slides
          if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
            setCompletedSlides(prev => [...prev, currentSlideIndex]);
          } else {
            // End of slides reached, complete the session
            handleComplete();
          }
          setIsTransitioningSection(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="h-dynamic-screen bg-gradient-primary flex relative overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              
              {/* Sidebar content */}
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-full w-72 sm:w-80 bg-gradient-to-b from-purple-950/95 to-purple-900/95 backdrop-blur-xl border-r border-white/10 z-50 lg:relative lg:w-96"
              >
                <div className="flex flex-col h-full">
                  {/* Sidebar header */}
                  <div className="p-4 sm:p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white">Wine Tasting</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(false)}
                        className="text-white hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    {/* Overall progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Overall Progress</span>
                        <span className="text-white font-medium">
                          {Math.round(((currentSlideIndex + 1) / slides.length) * 100)}%
                        </span>
                      </div>
                      <Progress value={((currentSlideIndex + 1) / slides.length) * 100} className="h-2" />
                    </div>

                    {/* Sync status */}
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-white/60">Session Status</span>
                      <div className="flex items-center space-x-1">
                        {syncStatus === 'synced' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Synced</span>
                          </>
                        ) : syncStatus === 'syncing' ? (
                          <>
                            <div className="w-3 h-3 rounded-full border border-yellow-400 border-t-transparent animate-spin" />
                            <span className="text-yellow-400">Syncing</span>
                          </>
                        ) : (
                          <>
                            <CloudOff className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Data refresh section */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="text-white/40">
                        {dataUpdatedAt && (
                          <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          // Invalidate and refetch the slides data
                          queryClient.invalidateQueries({ queryKey: slidesQueryKey });
                          refetchSlides();
                        }}
                        disabled={isLoading}
                        className="text-white/60 hover:text-white hover:bg-white/10 h-6 px-2"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Wine sections */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {wines.map((wine, wineIndex) => {
                      const wineSlides = sortedSlidesByWine[wine.id] || [];
                      const wineStartIndex = slides.findIndex(s => s.packageWineId === wine.id);
                      const isExpanded = expandedWines[wine.id];
                      const section = sections[wineIndex];
                      const isCurrentWine = wine.id === currentWine?.id;

                      return (
                        <motion.div
                          key={wine.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: wineIndex * 0.1 }}
                          className="space-y-3"
                        >
                          {/* Wine header */}
                          <button
                            onClick={() => setExpandedWines(prev => ({ ...prev, [wine.id]: !isExpanded }))}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                section?.isCompleted ? 'bg-green-400' : 
                                section?.isActive ? 'bg-purple-400' : 'bg-white/30'
                              }`} />
                              <div className="text-left">
                                <h3 className="font-medium text-white">
                                  Wine {wineIndex + 1}: <DynamicTextRenderer text={wine.wineName} />
                                </h3>
                                <p className="text-xs text-white/60">
                                  <DynamicTextRenderer text={wine.wineDescription || ''} />
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`} />
                          </button>

                          {/* Wine progress */}
                          <div className="px-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/60">
                                {wineSlides.length} slides
                              </span>
                              <span className="text-white/80">
                                {Math.round(section?.progress || 0)}%
                              </span>
                            </div>
                            <Progress value={section?.progress || 0} className="h-1" />
                          </div>

                          {/* Slides list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 overflow-hidden"
                              >
                                {wineSlides.map((slide: any, slideIndex: number) => {
                                  const globalSlideIndex = wineStartIndex + slideIndex;
                                  const isCompleted = completedSlides.includes(globalSlideIndex);
                                  const isCurrent = globalSlideIndex === currentSlideIndex;

                                  return (
                                    <button
                                      key={slide.id}
                                      onClick={() => jumpToSlide(globalSlideIndex)}
                                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                                        isCurrent 
                                          ? 'bg-purple-500/30 border border-purple-400/50' 
                                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                      }`}
                                    >
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        isCompleted ? 'bg-green-400' : 
                                        isCurrent ? 'bg-purple-400' : 'bg-white/30'
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                          isCurrent ? 'text-purple-100' : 'text-white'
                                        }`}>
                                          {slide.type === 'interlude' 
                                            ? (slide.payloadJson as any)?.title || 'Interlude'
                                            : (slide.payloadJson as any)?.title || (slide.payloadJson as any)?.question || 'Question'
                                          }
                                        </p>
                                        <p className="text-xs text-white/60 capitalize">
                                          {slide.type.replace('_', ' ')}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-3 sm:p-4 lg:p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="text-white">
                  <h1 className="font-semibold">
                    {currentSlide?._isPackageIntro ? (
                      <DynamicTextRenderer text={slidesData.package.name} />
                    ) : (
                      <DynamicTextRenderer text={currentWine?.wineName || 'Wine Tasting'} />
                    )}
                  </h1>
                  <p className="text-xs text-white/60">
                    {currentSlide?._isPackageIntro ? 
                      "Welcome to your tasting experience" :
                      <DynamicTextRenderer text={slidesData.package.name} />
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-right text-white">
                <p className="text-sm font-medium">{Math.min(currentSlideIndex + 1, slides.length)} of {slides.length}</p>
                <p className="text-xs text-white/60">
                  {Math.round((Math.min(currentSlideIndex + 1, slides.length) / slides.length) * 100)}% complete
                </p>
              </div>
            </div>
            
            {/* Section progress bars */}
            <div className="mt-4">
              <SegmentedProgressBar 
                sections={sections}
                currentWineName={currentSlide?._isPackageIntro ? null : currentWine?.wineName}
                currentOverallProgressInfo={`${Math.min(currentSlideIndex + 1, slides.length)} of ${slides.length} slides`}
                onSectionClick={(sectionName) => {
                  const wine = wines.find(w => w.wineName === sectionName);
                  if (wine) {
                    const wineStartIndex = slides.findIndex(s => s.packageWineId === wine.id);
                    if (wineStartIndex !== -1) {
                      jumpToSlide(wineStartIndex);
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Main slide content */}
          <div className="flex-grow overflow-y-auto p-3">
            <div key={`slide-wrapper-${currentSlideIndex}`} className="min-h-full flex flex-col justify-center max-w-2xl mx-auto w-full">
              <DebugErrorBoundary name="SlideContent">
                {renderSlideContent()}
              </DebugErrorBoundary>
            </div>
          </div>

          {/* Navigation footer */}
          <div className="flex-shrink-0 p-4 border-t border-white/10 bg-gradient-to-t from-purple-950/20 to-transparent safe-area-bottom">
            <div className="flex justify-between items-center max-w-2xl mx-auto">
              <Button
                variant="ghost"
                onClick={goToPreviousSlide}
                disabled={currentSlideIndex === 0 || isNavigating}
                className="text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {/* Slide indicators */}
              <div className="flex space-x-2">
                {slides.slice(Math.max(0, currentSlideIndex - 2), currentSlideIndex + 3).map((_, relativeIndex) => {
                  const actualIndex = Math.max(0, currentSlideIndex - 2) + relativeIndex;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => jumpToSlide(actualIndex)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        actualIndex === currentSlideIndex 
                          ? 'bg-purple-400 scale-125' 
                          : actualIndex < currentSlideIndex 
                            ? 'bg-purple-600 hover:bg-purple-500' 
                            : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${actualIndex + 1}`}
                    />
                  );
                })}
              </div>

              <Button
                variant={currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro ? "default" : "ghost"}
                onClick={goToNextSlide}
                disabled={isNavigating || disableNextButton}
                className={
                  currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 transform hover:scale-105 active:scale-100 text-[14px] sm:text-sm md:text-base min-h-[44px] flex items-center justify-center"
                    : "text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm min-h-[44px] flex items-center justify-center"
                }
              >
                <span className="hidden sm:inline">
                  {currentSlideIndex >= slides.length - 1 ? 'Complete' : 
                   (currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro) ? 'Continue Your Wine Journey' : 'Next'}
                </span>
                <span className="sm:hidden">
                  {currentSlideIndex >= slides.length - 1 ? 'Complete' : 
                   (currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro) ? 'Continue' : 'Next'}
                </span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Transition Overlay */}
      {showSectionTransition && sectionTransitionData && (
        <SectionTransition
          isVisible={showSectionTransition}
          fromSection={sectionTransitionData.fromSection}
          toSection={sectionTransitionData.toSection}
          wineName={sectionTransitionData.wineName}
          onComplete={handleSectionTransitionComplete}
          duration={3000}
        />
      )}



      {/* Wine Completion Status - Blocking Timer Modal */}
      {(() => {
        const shouldShowBasedOnParticipants = shouldShowWineCompletionTimer();
        const shouldShow = sessionId && participantId && currentWineCompletionStatus.wineId && 
                          currentWineCompletionStatus.isBlocking && shouldShowBasedOnParticipants;
        
        return shouldShow;
      })() && (
        <div 
          className="fixed inset-0 z-[9999] bg-gradient-primary/95 backdrop-blur-lg"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          <div className="h-full w-full flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Wine Completed! 🍷
                </h2>
                <p className="text-white/80 text-lg">
                  {currentWine?.wineName || 'Unknown Wine'}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-white/70 mb-4">
                  Waiting for others to finish their tasting...
                </p>

                <div className="bg-white/10 rounded-2xl p-4 mb-4">
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                  <div className="text-white/60 text-sm">
                    Please wait while we calculate averages
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {showSkipButton && (
                  <Button
                    onClick={handleWineCompletionSkip}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3"
                    size="lg"
                  >
                    Skip Wait & Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                <p className="text-white/60 text-sm">
                  {showSkipButton ?
                    'Or wait for the timer to automatically continue' :
                    'Skip option will be available in a few seconds...' + '\n if only you are reviewing you will be redirected next'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Step 5: Loading state for Group Results calculation OR checking participants */}
      {(() => {
        const shouldShowBasedOnParticipants = shouldShowWineCompletionTimer();
        const shouldShow = sessionId && participantId && currentWineCompletionStatus.wineId && 
                          (currentWineCompletionStatus.isLoadingAverages || isCheckingCompletion) && 
                          !currentWineCompletionStatus.showingAverages && shouldShowBasedOnParticipants;
        return shouldShow;
      })() && (
        <div 
          className="fixed inset-0 z-[9999] bg-gradient-primary/95 backdrop-blur-lg"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          <div className="h-full w-full flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Please chat amongst yourselves about the group results!
                </h2>
                <p className="text-white/80 text-lg">
                  {currentWine?.wineName || 'Wine'}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-white/70 mb-4">
                  {isCheckingCompletion ? 
                    'Checking if all participants have finished...' :
                    'Analyzing responses and calculating averages...'
                  }
                </p>

                <div className="bg-white/10 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-purple-400"></div>
                    <span className="text-white font-medium">
                      {isCheckingCompletion ? 'Checking Participants' : 'Processing Results'}
                    </span>
                  </div>
                  <div className="text-white/60 text-sm">
                    This will only take a moment...
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Step 6: Wine Averages Display - Show after processing completes */}
      {(() => {
        const shouldShowBasedOnParticipants = shouldShowWineCompletionTimer();
        const shouldShow = sessionId && participantId && currentWineCompletionStatus.showingAverages && 
                          currentWineCompletionStatus.averagesData && shouldShowBasedOnParticipants;
        
        // Additional check: Only show if there are actually questions with averages to display
        let hasValidAverages = false;
        if (currentWineCompletionStatus.averagesData) {
          const data = currentWineCompletionStatus.averagesData;
          const questionsData = data.questions || data.data || data.averages;
          if (questionsData && typeof questionsData === 'object' && Object.keys(questionsData).length > 0) {
            hasValidAverages = true;
          }
        }
        
        const finalShouldShow = shouldShow && hasValidAverages;
        
        // If we don't have valid averages to show, automatically complete and continue
        if (shouldShow && !hasValidAverages && currentWineCompletionStatus.averagesData) {
          setTimeout(() => handleAveragesComplete(), 100);
          return false;
        }
        
        return finalShouldShow;
      })() && (
        <div 
          className="fixed inset-0 z-[9999] bg-gradient-primary/95 backdrop-blur-lg"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          <div className="h-full w-full flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-4xl w-full text-center my-8"
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Please chat amongst yourselves about the group results!
                </h2>
                <p className="text-white/80 text-lg">
                  {currentWine?.wineName || 'Wine'} - Average Scores
                </p>
              </div>

              <div className="mb-6 max-h-96 overflow-y-auto custom-scrollbar overflow-y-scroll">
                {/* Always try to show averages data, even if there's a message */}
                {currentWineCompletionStatus.averagesData.questions || currentWineCompletionStatus.averagesData.data || currentWineCompletionStatus.averagesData.averages ? (
                  (() => {
                    // Enhanced data parsing to handle different API response structures
                    const questionsData = currentWineCompletionStatus.averagesData.questions || 
                                        currentWineCompletionStatus.averagesData.data?.questions ||
                                        currentWineCompletionStatus.averagesData.averages?.questions ||
                                        currentWineCompletionStatus.averagesData.data ||
                                        currentWineCompletionStatus.averagesData.averages ||
                                        currentWineCompletionStatus.averagesData;
                    
                    if (!questionsData || typeof questionsData !== 'object') {
                      return (
                        <div className="bg-white/10 rounded-2xl p-4">
                          <h3 className="text-white font-medium mb-2">
                            Processing Results...
                          </h3>
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Convert to array format for consistent processing
                    const questionsArray = Array.isArray(questionsData) 
                      ? questionsData 
                      : Object.entries(questionsData).map(([key, value]) => ({
                          id: key,
                          ...((typeof value === 'object' && value !== null) ? value : { average: value })
                        }));
                    
                    if (questionsArray.length === 0) {
                      return (
                        <div className="bg-white/10 rounded-2xl p-4">
                          <h3 className="text-white font-medium mb-2">
                            No Questions Found
                          </h3>
                          <p className="text-white/60 text-sm">
                            No rating questions were found for this wine.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <Accordion type="single" collapsible className="w-full space-y-3">
                        {questionsArray.map((questionData: any, index: number) => {
                          const questionId = questionData.id || questionData.questionId || `question-${index}`;
                          const questionTitle = questionData.questionTitle || 
                                              questionData.title || 
                                              questionData.question || 
                                              questionData.name ||
                                              `Question ${index + 1}`;
                          const average = questionData.average || questionData.avg || questionData.value || 0;
                          const participantCount = questionData.participantCount || 
                                                 questionData.participants || 
                                                 questionData.count || 
                                                 questionData.responseCount || 0;
                          const scaleMax = questionData.scaleMax || questionData.scale_max || 10;
                          const responseDistribution = questionData.responseDistribution;
                          const questionType = questionData.questionType || 'scale';
                          const hasTextResponses = questionData.hasTextResponses;
                          const hasSentimentAnalysis = questionData.hasSentimentAnalysis;
                          // Normalize boolean distributions when provided as an object map
                          let booleanDistributionArray: Array<{ option: string; optionText: string; count: number; percentage: number; users?: string[] }> | null = null;
                          if (questionType === 'boolean' && responseDistribution) {
                            if (Array.isArray(responseDistribution)) {
                              booleanDistributionArray = responseDistribution.map((opt: any) => ({
                                option: String(opt.option ?? (opt.optionText?.toLowerCase() === 'yes' ? 'true' : 'false')),
                                optionText: opt.optionText ?? (String(opt.option) === 'true' ? 'Yes' : 'No'),
                                count: Number(opt.count ?? 0),
                                percentage: Number(opt.percentage ?? 0),
                                users: opt.users || []
                              }));
                            } else if (typeof responseDistribution === 'object') {
                              const entries = Object.entries(responseDistribution as Record<string, any>);
                              const counts = entries.map(([key, value]) => typeof value === 'object' && value !== null ? Number(value.count ?? 0) : Number(value ?? 0));
                              const total = counts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 0;
                              booleanDistributionArray = entries.map(([key, value], idx) => {
                                const isTrue = key === 'true' || key === '1' || key === 'yes' || key === 'Yes';
                                const count = typeof value === 'object' && value !== null ? Number(value.count ?? 0) : Number(value ?? 0);
                                const users = (typeof value === 'object' && value !== null && Array.isArray((value as any).users)) ? (value as any).users : [];
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                return {
                                  option: key,
                                  optionText: isTrue ? 'Yes' : 'No',
                                  count: Number.isFinite(count) ? count : 0,
                                  percentage,
                                  users
                                };
                              });
                            }
                          }
                          const booleanTotalCount = (questionType === 'boolean' && booleanDistributionArray)
                            ? booleanDistributionArray.reduce((sum, opt) => sum + (opt.count || 0), 0)
                            : 0;
                          const booleanMaxPercent = (questionType === 'boolean' && booleanDistributionArray && booleanDistributionArray.length > 0)
                            ? Math.max(...booleanDistributionArray.map((opt) => opt.percentage || 0))
                            : 0;
                          // Compute observed min/max for scale questions from object-form responseDistribution
                          let observedMin: number | null = null;
                          let observedMax: number | null = null;
                          if (
                            questionType === 'scale' &&
                            responseDistribution &&
                            typeof responseDistribution === 'object' &&
                            !Array.isArray(responseDistribution)
                          ) {
                            const numericKeys = Object.keys(responseDistribution)
                              .map((k) => Number(k))
                              .filter((v) => !Number.isNaN(v) && (responseDistribution as any)[v] > 0);
                            if (numericKeys.length > 0) {
                              observedMin = Math.min(...numericKeys);
                              observedMax = Math.max(...numericKeys);
                            }
                          }
                          
                          // Format average to show meaningful precision and handle different types
                          let formattedAverage = '';
                          let displayUnit = '';
                          
                          if ((hasTextResponses || questionType === 'text') && !hasSentimentAnalysis && typeof average !== 'number') {
                            // Only show response count if we don't have sentiment analysis and no numeric average
                            formattedAverage = `${participantCount} response${participantCount !== 1 ? 's' : ''}`;
                            displayUnit = '';
                          } else if (typeof average === 'number') {
                            if (questionType === 'multiple_choice') {
                              // For multiple choice, show the highest percentage from the distribution
                              if (responseDistribution && Array.isArray(responseDistribution) && responseDistribution.length > 0) {
                                const maxPercentage = Math.max(...responseDistribution.map((opt: any) => opt.percentage || 0));
                                formattedAverage = `${maxPercentage.toFixed(0)}%`;
                                displayUnit = '';
                              } else {
                                formattedAverage = `${(average * 100).toFixed(0)}%`;
                                displayUnit = 'consensus';
                              }
                            } else if (questionType === 'boolean') {
                              formattedAverage = `${(average * 100).toFixed(0)}%`;
                              displayUnit = 'agreement';
                            } else if (questionType === 'text' && hasSentimentAnalysis) {
                              // Sentiment analysis scores (1-10 scale)
                              formattedAverage = average % 1 === 0 ? average.toString() : average.toFixed(1);
                              displayUnit = '/10';
                            } else {
                              // Scale questions
                              formattedAverage = average % 1 === 0 ? average.toString() : average.toFixed(1);
                              displayUnit = `/${scaleMax}`;
                            }
                          } else {
                            formattedAverage = average || 'N/A';
                            displayUnit = '';
                          }
                          
                          return (
                            <AccordionItem key={questionId} value={questionId} className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors">
                              <AccordionTrigger className="px-6 py-4 hover:no-underline text-white hover:text-purple-200 transition-colors">
                                <div className="flex items-center justify-between w-full text-left">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg leading-tight text-white">
                                      {questionTitle}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2">
                                      {(questionType !== 'text' || hasSentimentAnalysis) && (
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-2xl font-bold text-purple-300">
                                            {formattedAverage}
                                          </span>
                                          {displayUnit && (
                                            <span className="text-lg text-white/60 font-medium">
                                              {displayUnit}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {questionType === 'scale' && observedMin !== null && observedMax !== null && (
                                        <div className="text-white/60 text-sm">
                                          Min-Max: {observedMin} – {observedMax}
                                        </div>
                                      )}
                                      <div className="text-white/50 text-sm">
                                        {participantCount > 0 ? (
                                          <>
                                            <Users className="inline w-4 h-4 mr-1" />
                                            {participantCount} participant{participantCount !== 1 ? 's' : ''}
                                          </>
                                        ) : (
                                          <span>No responses</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              
                              <AccordionContent className="px-6 pb-6">
                                <div className="space-y-4">
                                  {/* Enhanced visual progress bar - show for numeric averages including sentiment scores, but not for multiple choice or boolean with distribution */}
                                  {typeof average === 'number' && (questionType !== 'text' || hasSentimentAnalysis) && questionType !== 'multiple_choice' && questionType !== 'boolean' && (
                                    <div className="w-full bg-white/20 rounded-full h-4 mb-3 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 h-4 rounded-full transition-all duration-1500 ease-out shadow-sm"
                                        style={{ 
                                          width: `${Math.min(100, Math.max(0, 
                                            questionType === 'boolean' ? average * 100 : 
                                            questionType === 'text' && hasSentimentAnalysis ? (average / 10 * 100) :
                                            (average / scaleMax * 100)
                                          ))}%` 
                                        }}
                                      >
                                        <div className="w-full h-full bg-white/20 animate-pulse"></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                                                    {/* Simple progress bar for multiple choice showing highest percentage */}
                                  {questionType === 'multiple_choice' && responseDistribution && Array.isArray(responseDistribution) && responseDistribution.length > 0 && (
                                    <div className="w-full bg-white/20 rounded-full h-4 mb-3 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 h-4 rounded-full transition-all duration-1500 ease-out shadow-sm"
                                        style={{ 
                                          width: `${Math.min(100, Math.max(0, Math.max(...responseDistribution.map((opt: any) => opt.percentage || 0))))}%` 
                                        }}
                                      >
                                        <div className="w-full h-full bg-white/10 animate-pulse"></div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Simple progress bar for boolean questions showing highest percentage */}
                                  {questionType === 'boolean' && responseDistribution && Array.isArray(responseDistribution) && responseDistribution.length > 0 && (
                                    <div className="w-full bg-white/20 rounded-full h-4 mb-3 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 h-4 rounded-full transition-all duration-1500 ease-out shadow-sm"
                                        style={{ 
                                          width: `${Math.min(100, Math.max(0, Math.max(...responseDistribution.map((opt: any) => opt.percentage || 0))))}%` 
                                        }}
                                      >
                                        <div className="w-full h-full bg-white/10 animate-pulse"></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Enhanced Response distribution for multiple choice */}
                                  {questionType === 'multiple_choice' && responseDistribution && Array.isArray(responseDistribution) && responseDistribution.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                      <div className="text-sm text-white/70 mb-3 font-medium">Answer Distribution:</div>
                                      <div className="space-y-3">
                                        {responseDistribution.map((option: any, index: number) => {
                                          const percentage = option.percentage || 0;
                                          const count = option.count || 0;
                                          const optionText = option.optionText || `Option ${option.optionNumber || index + 1}`;
                                          
                                          return (
                                            <div key={option.optionNumber || index} className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <div className="text-white text-sm font-medium flex-1 pr-3 text-left">
                                                  {optionText}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-white/80 text-sm font-semibold">
                                                    {percentage}%
                                                  </span>
                                                  <span className="text-xs text-white/50">
                                                    ({count} vote{count !== 1 ? 's' : ''})
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                                                <div 
                                                  className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                                  style={{ 
                                                    width: `${Math.min(100, Math.max(0, percentage))}%` 
                                                  }}
                                                >
                                                  <div className="w-full h-full bg-white/10 animate-pulse"></div>
                                                </div>
                                              </div>
                                              {/* Show users who selected this option */}
                                              {option.users && option.users.length > 0 && (
                                                <div className="mt-2 text-xs text-white/60">
                                                  <span className="font-medium">Selected by:</span> {option.users.join(', ')}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Boolean question distribution with users */}
                                  {questionType === 'boolean' && booleanDistributionArray && booleanDistributionArray.some((o: any) => (o.count || 0) > 0) && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                      <div className="text-sm text-white/70 mb-3 font-medium">Answer Distribution:</div>
                                      <div className="space-y-3">
                                        {booleanDistributionArray.map((option: any, index: number) => {
                                          const percentage = option.percentage || 0;
                                          const count = option.count || 0;
                                          const optionText = option.optionText || (option.option === 'true' ? 'Yes' : 'No');
                                          const users = option.users || [];
                                          
                                          return (
                                            <div key={option.option || index} className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <div className="text-white text-sm font-medium flex-1 pr-3 text-left">
                                                  {optionText}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-white/80 text-sm font-semibold">
                                                    {percentage}%
                                                  </span>
                                                  <span className="text-xs text-white/50">
                                                    ({count} vote{count !== 1 ? 's' : ''})
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                                                <div 
                                                  className="bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                                  style={{ 
                                                    width: `${Math.min(100, Math.max(0, percentage))}%` 
                                                  }}
                                                >
                                                  <div className="w-full h-full bg-white/10 animate-pulse"></div>
                                                </div>
                                              </div>
                                              {/* Show users who selected this option */}
                                              {users.length > 0 && (
                                                <div className="mt-2 text-xs text-white/60">
                                                  <span className="font-medium">Selected by:</span> {users.join(', ')}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Text question summary and sentiment analysis (no key themes) */}
                                  {questionType === 'text' && (questionData.textSummary || questionData.summary || questionData.responseDistribution?.summary) && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                      <div className="text-sm text-white/70 mb-3 font-medium">Response Summary:</div>
                                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                                        <p className="text-white/90 text-sm leading-relaxed">
                                          {questionData.textSummary || questionData.summary || questionData.responseDistribution?.summary}
                                        </p>
                                      </div>
                                      {/* Sentiment if available */}
                                      {(questionData.sentiment || questionData.responseDistribution?.sentiment) && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-white/50">Overall sentiment:</span>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            (questionData.sentiment || questionData.responseDistribution?.sentiment) === 'positive' ? 'bg-green-500/20 text-green-300' :
                                            (questionData.sentiment || questionData.responseDistribution?.sentiment) === 'negative' ? 'bg-red-500/20 text-red-300' :
                                            'bg-gray-500/20 text-gray-300'
                                          }`}>
                                            {questionData.sentiment || questionData.responseDistribution?.sentiment}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* No response distribution for scale questions as requested */}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    );
                  })()
                ) : (
                  <div className="bg-white/10 rounded-2xl p-4">
                    <h3 className="text-white font-medium mb-2">
                      {currentWineCompletionStatus.averagesData.message || 'Processing Results...'}
                    </h3>
                    {currentWineCompletionStatus.averagesData.message ? (
                      <p className="text-white/70 text-sm">
                        {currentWineCompletionStatus.averagesData.scaleQuestions > 0 
                          ? `Found ${currentWineCompletionStatus.averagesData.scaleQuestions} questions but couldn't display them properly.`
                          : 'No scale questions found for this wine.'}
                      </p>
                    ) : (
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-white/60 text-sm mb-4">
                🍷 Ready to continue to the next wine when you are!
              </div>
              
              <Button 
                onClick={handleAveragesComplete}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-4 px-8 text-lg"
                size="lg"
              >
                Continue to Next Wine
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Final Congratulations Overlay */}
      {showFinalCongratulations && (
        <div 
          className="fixed inset-0 z-[10000] bg-gradient-primary/95 backdrop-blur-lg"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
        >
          <div className="h-full w-full flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Congratulations!
                </h2>
                <p className="text-white/80 text-lg">
                  You've completed your tasting experience.
                </p>
              </div>

              <Button 
                onClick={() => {
                  const email = participant?.email as string | undefined;
                  if (email) {
                    setLocation(`/dashboard/${encodeURIComponent(email)}`);
                  } else {
                    setLocation('/login');
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3"
                size="lg"
              >
                Go to Your Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Wine Completion Status - Non-blocking banner (when not blocking AND not showing averages) */}
      {sessionId && participantId && currentWineCompletionStatus.wineId && 
       !currentWineCompletionStatus.isBlocking && 
       !currentWineCompletionStatus.showingAverages && (
        <WineCompletionStatus
          sessionId={sessionId}
          wineId={currentWineCompletionStatus.wineId}
          wineName={currentWine?.wineName || 'Unknown Wine'}
          participantId={participantId}
          isParticipantFinished={currentWineCompletionStatus.isParticipantFinished}
          onSkipTimer={handleWineCompletionSkip}
          onAllCompleted={handleWineCompletionAllCompleted}
          onTimerExpired={handleWineCompletionTimerExpired}
        />
      )}
    </>
  );
}