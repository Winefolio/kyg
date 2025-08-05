import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Star, Users, Clock, MapPin, Calendar,
  TrendingUp, TrendingDown, Minus, BookOpen, MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TastingSession {
  id: string;
  title: string;
  sommelier: {
    name: string;
    title: string;
    experience: string;
    specialties: string[];
    rating: number;
    avatar: string;
  };
  date: string;
  duration: number;
  participants: number;
  location: string;
  description: string;
}

interface WineScore {
  wineName: string;
  vintage: string;
  region: string;
  country: string;
  grapeVarietal: string;
  individualScores: { participantId: string; score: number }[];
  groupAverage: number;
  totalParticipants: number;
  userScore: number; // Changed from brookeScore to userScore
}

interface TastingDetailData {
  session: TastingSession;
  wines: WineScore[];
  sommelierObservations: string[];
  userNotes: string;
  overallRating: number;
}

export default function TastingDetailView() {
  const { email, sessionId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userNotes, setUserNotes] = useState("");
  const [overallRating, setOverallRating] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedObservations, setEditedObservations] = useState("");
  const [descriptionUpdateLoading, setDescriptionUpdateLoading] = useState(false);

  // Fetch tasting session details
  const { data: tastingData, isLoading } = useQuery<TastingDetailData>({
    queryKey: [`/api/dashboard/session/${sessionId}/details`, email],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboard/session/${sessionId}/details?userEmail=${email}`, null);
      return response.json();
    },
    enabled: !!sessionId && !!email,
  });

  useEffect(() => {
    if (tastingData) {
      setUserNotes(tastingData.userNotes);
      setOverallRating(tastingData.overallRating);
      setEditedObservations(
        tastingData.sommelierObservations && tastingData.sommelierObservations.length > 0 
          ? tastingData.sommelierObservations.join('\n') 
          : ''
      );
    }
  }, [tastingData]);

  const handleSaveObservations = async () => {
    try {
      setDescriptionUpdateLoading(true);
      
      await apiRequest('POST', `/api/dashboard/session/${sessionId}/update-observations`, {
        observations: editedObservations.split('\n'),
      });
      
      toast({ title: 'Observations updated successfully!' });
      setIsEditing(false);
      
      // Invalidate and refetch the session details to show updated observations
      await queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/session/${sessionId}/details`, email]
      });
      
      setDescriptionUpdateLoading(false);

    } catch (error) {
      setDescriptionUpdateLoading(false);
      toast({ title: 'Failed to update observations.', description: 'Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300 mx-auto mb-4"></div>
          <p className="text-purple-200">Loading tasting details...</p>
        </div>
      </div>
    );
  }

  if (!tastingData || !tastingData.session || !tastingData.wines || !tastingData.sommelierObservations) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Tasting Not Found</h1>
          <p className="mb-6">We couldn't find the tasting session you're looking for.</p>
          <Button onClick={() => setLocation(`/dashboard/${email}`)} variant="outline" className="text-white border-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { session, wines, sommelierObservations } = tastingData;

  // Find the current user's scores
  const getUserScore = (wine: WineScore): number => {
    // Use the current user's specific score from the backend
    return wine.userScore || 0;
  };

  const getScoreDifference = (userScore: number, groupAverage: number) => {
    const difference = userScore - groupAverage;
    return {
      value: Math.abs(difference),
      isPositive: difference >= 0,
      isZero: difference === 0,
    };
  };

  return (
    <div className="min-h-screen bg-[#1a0b2e]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/dashboard/${email}`)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{session.title}</h1>
              <p className="text-purple-200">Detailed Tasting Experience</p>
            </div>
          </div>
        </div>

        {/* Session Overview Card */}
        <Card className="bg-[#2d1b4e] border-[#4c2a85] mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-6">
              {/* Sommelier Info */}
              {/*<div className="flex items-center space-x-4">*/}
              {/*  <Avatar className="h-16 w-16">*/}
              {/*    <AvatarImage src={session.sommelier.avatar} />*/}
              {/*    <AvatarFallback className="bg-[#4c2a85] text-white text-lg">*/}
              {/*      {session.sommelier.name.split(' ').map(n => n[0]).join('')}*/}
              {/*    </AvatarFallback>*/}
              {/*  </Avatar>*/}
              {/*  <div>*/}
              {/*    <h3 className="text-xl font-semibold text-white">{session.sommelier.name}</h3>*/}
              {/*    <p className="text-purple-200">{session.sommelier.title}</p>*/}
              {/*    <p className="text-sm text-purple-300">{session.sommelier.experience}</p>*/}
              {/*    <div className="flex items-center space-x-2 mt-2">*/}
              {/*      <Star className="w-4 h-4 text-yellow-400 fill-current" />*/}
              {/*      <span className="text-white">★{session.sommelier.rating} Sommelier Rating</span>*/}
              {/*    </div>*/}
              {/*    <div className="flex flex-wrap gap-1 mt-2">*/}
              {/*      {session.sommelier.specialties.map((specialty, index) => (*/}
              {/*          <Badge key={index} variant="outline" className="text-purple-200 border-purple-400 text-xs">*/}
              {/*            {specialty}*/}
              {/*          </Badge>*/}
              {/*      ))}*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>*/}

              {/* Session Details */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <Calendar className="w-6 h-6 text-purple-300 mx-auto mb-2" />
                  <p className="text-sm text-purple-200">Date</p>
                  <p className="text-white font-medium">{new Date(session.date).toLocaleDateString()}</p>
                </div>
                <div className="text-center">
                  <Clock className="w-6 h-6 text-purple-300 mx-auto mb-2" />
                  <p className="text-sm text-purple-200">Duration</p>
                  <p className="text-white font-medium">{session.duration} minutes</p>
                </div>
                <div className="text-center">
                  <Users className="w-6 h-6 text-purple-300 mx-auto mb-2" />
                  <p className="text-sm text-purple-200">Participants</p>
                  <p className="text-white font-medium">{session.participants} people</p>
                </div>
                {/*<div className="text-center">*/}
                {/*  <MapPin className="w-6 h-6 text-purple-300 mx-auto mb-2" />*/}
                {/*  <p className="text-sm text-purple-200">Location</p>*/}
                {/*  <p className="text-white font-medium">{session.location}</p>*/}
                {/*</div>*/}
              </div>
            </div>

            {/* Session Description */}
            <div className="mt-6 pt-6 border-t border-purple-400/20">
              <h4 className="text-white font-medium mb-2">About This Tasting</h4>
              <p className="text-purple-200">{session.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Wines Tasted Section */}
        <Card className="bg-[#2d1b4e] border-[#4c2a85] mb-8">
          <CardHeader>
            <CardTitle className="text-white">Wines Tasted ({wines.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wines.map((wine, index) => {
              const userScore = getUserScore(wine);
              const scoreDiff = getScoreDifference(userScore, wine.groupAverage);
              
              return (
                <div key={index} className="p-4 bg-[#1a0b2e] rounded-lg border border-purple-400/20">
                  {/* Desktop Layout */}
                  <div className="hidden sm:flex sm:items-center sm:space-x-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-1">{wine.wineName}</h4>
                      <p className="text-sm text-purple-200 mb-1">
                        {wine.vintage} {wine.region}, {wine.country}
                      </p>
                      <p className="text-sm text-purple-300">{wine.grapeVarietal}</p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {/* Your Score */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-purple-200">Your Score</span>
                        </div>
                        <p className="text-white font-semibold">{userScore.toFixed(1)}</p>
                      </div>
                      
                      {/* Group Average */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <Users className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-purple-200">Group Avg</span>
                        </div>
                        <p className="text-white font-semibold">{wine.groupAverage.toFixed(1)}</p>
                      </div>
                      
                      {/* Difference */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          {scoreDiff.isZero ? (
                            <Minus className="w-4 h-4 text-gray-400" />
                          ) : scoreDiff.isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-sm text-purple-200">Difference</span>
                        </div>
                        <p className={`font-semibold ${
                          scoreDiff.isZero ? 'text-gray-400' : 
                          scoreDiff.isPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {scoreDiff.isZero ? '0.0' : `${scoreDiff.isPositive ? '+' : '-'}${scoreDiff.value.toFixed(1)}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="sm:hidden">
                    {/* Wine Info */}
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-white mb-1">{wine.wineName}</h4>
                      <p className="text-sm text-purple-200 mb-1">
                        {wine.vintage} {wine.region}, {wine.country}
                      </p>
                      <p className="text-sm text-purple-300">{wine.grapeVarietal}</p>
                    </div>
                    
                    {/* Scores Row */}
                    <div className="flex justify-between items-center mb-3">
                      {/* Your Score */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-purple-200">Your Score</span>
                        </div>
                        <p className="text-white font-semibold">{userScore.toFixed(1)}</p>
                      </div>
                      
                      {/* Group Average */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <Users className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-purple-200">Group Avg</span>
                        </div>
                        <p className="text-white font-semibold">{wine.groupAverage.toFixed(1)}</p>
                      </div>
                    </div>
                    
                    {/* Difference at Bottom */}
                    <div className="flex items-center justify-center space-x-2 pt-3 border-t border-purple-400/20">
                      {scoreDiff.isZero ? (
                        <Minus className="w-4 h-4 text-gray-400" />
                      ) : scoreDiff.isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm text-purple-200">Difference:</span>
                      <span className={`font-semibold ${
                        scoreDiff.isZero ? 'text-gray-400' : 
                        scoreDiff.isPositive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {scoreDiff.isZero ? '0.0' : `${scoreDiff.isPositive ? '+' : '-'}${scoreDiff.value.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Sommelier Observations */}
        <Card className="bg-[#2d1b4e] border-[#4c2a85] mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Sommelier Observations & Recommendations</span>
            </CardTitle>
            <CardDescription className="text-purple-200">
              Notes from {session.sommelier.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {descriptionUpdateLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                  <span className="text-purple-200">Updating observations...</span>
                </div>
              </div>
            ) : isEditing ? (
              <div>
                <Textarea
                    value={editedObservations}
                    onChange={(e) => setEditedObservations(e.target.value)}
                    placeholder="Enter sommelier observations and recommendations..."
                    className="w-full bg-[#1a0b2e] border border-purple-400/20 text-white placeholder:text-purple-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={4}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="text-white border-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveObservations}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Save Observations
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {sommelierObservations.length > 0 ? (
                    <p className="text-purple-200 whitespace-pre-line">
                      {sommelierObservations.join('\n')}
                    </p>
                ) : (
                    <p className="text-purple-300">No observations available.</p>
                )}
                <Button
                  onClick={() => setIsEditing(true)}
                  className="mt-4 bg-purple-600 text-white hover:bg-purple-700"
                >
                  Edit Observations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Notes */}
        {/*<Card className="bg-[#2d1b4e] border-[#4c2a85] mb-8">*/}
        {/*  <CardHeader>*/}
        {/*    <CardTitle className="text-white flex items-center space-x-2">*/}
        {/*      <MessageSquare className="w-5 h-5" />*/}
        {/*      <span>Your Notes</span>*/}
        {/*    </CardTitle>*/}
        {/*  </CardHeader>*/}
        {/*  <CardContent>*/}
        {/*    <Textarea*/}
        {/*      value={userNotes}*/}
        {/*      onChange={(e) => setUserNotes(e.target.value)}*/}
        {/*      placeholder="Add your personal notes about this tasting experience..."*/}
        {/*      className="bg-[#1a0b2e] border-purple-400/20 text-white placeholder:text-purple-300"*/}
        {/*      rows={4}*/}
        {/*    />*/}
        {/*  </CardContent>*/}
        {/*</Card>*/}

        {/* Overall Rating */}
        <Card className="bg-[#2d1b4e] border-[#4c2a85] mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>Overall Experience Rating</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`text-2xl cursor-default ${
                      star <= overallRating ? 'text-yellow-400' : 'text-gray-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="text-purple-200">
                {overallRating > 0 ? `${overallRating}/5 stars` : 'Rate your experience'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}