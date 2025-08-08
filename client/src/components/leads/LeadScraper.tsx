import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Users, Hash, MapPin, Download, Save, Filter, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ScrapedProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  profileUrl: string;
  isPrivate: boolean;
  isBusiness: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  location?: string;
  website?: string;
  email?: string;
}

interface ScrapingResult {
  profiles: ScrapedProfile[];
  totalFound: number;
  errors: string[];
  duration: number;
}

const LeadScraper: React.FC = () => {
  const [scrapedProfiles, setScrapedProfiles] = useState<ScrapedProfile[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');

  // Form states for different scraping methods
  const [hashtagForm, setHashtagForm] = useState({
    hashtags: '',
    minFollowers: '',
    maxFollowers: '',
    hasEmail: false,
    hasWebsite: false,
    maxResults: '50'
  });

  const [competitorForm, setCompetitorForm] = useState({
    competitors: '',
    minFollowers: '',
    maxFollowers: '',
    hasEmail: false,
    hasWebsite: false,
    maxResults: '50'
  });

  const [locationForm, setLocationForm] = useState({
    locations: '',
    minFollowers: '',
    maxFollowers: '',
    hasEmail: false,
    hasWebsite: false,
    maxResults: '50'
  });

  // Scrape hashtags mutation
  const scrapeHashtagsMutation = useMutation({
    mutationFn: async (data: { hashtags: string[]; filters: any; maxResults: number }) => {
      const response = await fetch('/api/leads/scrape-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to scrape hashtags');
      return response.json();
    },
    onSuccess: (result: ScrapingResult) => {
      setScrapedProfiles(result.profiles);
      setIsScraping(false);
      toast({
        title: "Scraping completed!",
        description: `Found ${result.profiles.length} profiles in ${(result.duration / 1000).toFixed(1)}s`,
      });
    },
    onError: (error) => {
      setIsScraping(false);
      toast({
        title: "Scraping failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Scrape competitors mutation
  const scrapeCompetitorsMutation = useMutation({
    mutationFn: async (data: { competitors: string[]; filters: any; maxResults: number }) => {
      const response = await fetch('/api/leads/scrape-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to scrape competitors');
      return response.json();
    },
    onSuccess: (result: ScrapingResult) => {
      setScrapedProfiles(result.profiles);
      setIsScraping(false);
      toast({
        title: "Scraping completed!",
        description: `Found ${result.profiles.length} profiles in ${(result.duration / 1000).toFixed(1)}s`,
      });
    },
    onError: (error) => {
      setIsScraping(false);
      toast({
        title: "Scraping failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save to campaign mutation
  const saveToCampaignMutation = useMutation({
    mutationFn: async (data: { campaignId: number; profiles: ScrapedProfile[]; customMessage?: string }) => {
      const response = await fetch('/api/leads/save-to-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save profiles');
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Profiles saved!",
        description: `${result.savedCount} profiles added to campaign`,
      });
      setIsSaveDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleHashtagScrape = () => {
    if (!hashtagForm.hashtags.trim()) {
      toast({
        title: "Input required",
        description: "Please enter at least one hashtag",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    const hashtags = hashtagForm.hashtags.split(',').map(h => h.trim().replace('#', ''));
    const filters: any = {};
    
    if (hashtagForm.minFollowers) filters.minFollowers = parseInt(hashtagForm.minFollowers);
    if (hashtagForm.maxFollowers) filters.maxFollowers = parseInt(hashtagForm.maxFollowers);
    if (hashtagForm.hasEmail) filters.hasEmail = true;
    if (hashtagForm.hasWebsite) filters.hasWebsite = true;

    scrapeHashtagsMutation.mutate({
      hashtags,
      filters,
      maxResults: parseInt(hashtagForm.maxResults)
    });
  };

  const handleCompetitorScrape = () => {
    if (!competitorForm.competitors.trim()) {
      toast({
        title: "Input required",
        description: "Please enter at least one competitor username",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    const competitors = competitorForm.competitors.split(',').map(c => c.trim().replace('@', ''));
    const filters: any = {};
    
    if (competitorForm.minFollowers) filters.minFollowers = parseInt(competitorForm.minFollowers);
    if (competitorForm.maxFollowers) filters.maxFollowers = parseInt(competitorForm.maxFollowers);
    if (competitorForm.hasEmail) filters.hasEmail = true;
    if (competitorForm.hasWebsite) filters.hasWebsite = true;

    scrapeCompetitorsMutation.mutate({
      competitors,
      filters,
      maxResults: parseInt(competitorForm.maxResults)
    });
  };

  const handleLocationScrape = () => {
    if (!locationForm.locations.trim()) {
      toast({
        title: "Input required",
        description: "Please enter at least one location",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    const locations = locationForm.locations.split(',').map(l => l.trim());
    const filters: any = {};
    
    if (locationForm.minFollowers) filters.minFollowers = parseInt(locationForm.minFollowers);
    if (locationForm.maxFollowers) filters.maxFollowers = parseInt(locationForm.maxFollowers);
    if (locationForm.hasEmail) filters.hasEmail = true;
    if (locationForm.hasWebsite) filters.hasWebsite = true;

    // For now, we'll use hashtag scraping as a placeholder for location scraping
    // In a real implementation, you'd have a separate location scraping endpoint
    scrapeHashtagsMutation.mutate({
      hashtags: locations,
      filters,
      maxResults: parseInt(locationForm.maxResults)
    });
  };

  const handleSaveToCampaign = () => {
    if (!selectedCampaignId) {
      toast({
        title: "Campaign required",
        description: "Please select a campaign",
        variant: "destructive",
      });
      return;
    }

    saveToCampaignMutation.mutate({
      campaignId: parseInt(selectedCampaignId),
      profiles: scrapedProfiles,
      customMessage: customMessage || undefined
    });
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/leads/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: scrapedProfiles }),
      });

      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scraped_profiles.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "CSV exported!",
        description: "Profiles have been exported to CSV file",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const calculateProfileScore = (profile: ScrapedProfile) => {
    let score = 0;
    
    // Follower count (0-30 points)
    if (profile.followers >= 1000 && profile.followers <= 10000) score += 30;
    else if (profile.followers >= 10000 && profile.followers <= 50000) score += 25;
    else if (profile.followers >= 50000) score += 20;
    else if (profile.followers >= 500) score += 15;

    // Business indicators (0-25 points)
    if (profile.isBusiness) score += 15;
    if (profile.hasEmail) score += 10;
    if (profile.hasWebsite) score += 10;

    // Bio quality (0-20 points)
    if (profile.bio && profile.bio.length > 50) score += 20;
    else if (profile.bio && profile.bio.length > 20) score += 15;
    else if (profile.bio) score += 10;

    return Math.min(100, score);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Scraper</h1>
          <p className="text-gray-600">Find and scrape Instagram profiles for your campaigns</p>
        </div>
        {scrapedProfiles.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save to Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save to Campaign</DialogTitle>
                  <DialogDescription>
                    Save scraped profiles to an existing campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Campaign ID</label>
                    <Input
                      placeholder="Enter campaign ID"
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custom Message (Optional)</label>
                    <Textarea
                      placeholder="Custom message to send to these profiles"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveToCampaign} 
                    disabled={!selectedCampaignId || saveToCampaignMutation.isPending}
                    className="w-full"
                  >
                    {saveToCampaignMutation.isPending ? 'Saving...' : 'Save Profiles'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Scraping Methods */}
      <Tabs defaultValue="hashtags" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hashtags" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Hashtags
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hashtags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape by Hashtags</CardTitle>
              <CardDescription>
                Find profiles that use specific hashtags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Hashtags</label>
                <Textarea
                  placeholder="Enter hashtags separated by commas (e.g., fitness, workout, gym)"
                  value={hashtagForm.hashtags}
                  onChange={(e) => setHashtagForm(prev => ({ ...prev, hashtags: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Followers</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={hashtagForm.minFollowers}
                    onChange={(e) => setHashtagForm(prev => ({ ...prev, minFollowers: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Followers</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={hashtagForm.maxFollowers}
                    onChange={(e) => setHashtagForm(prev => ({ ...prev, maxFollowers: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filters</label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hashtag-email"
                      checked={hashtagForm.hasEmail}
                      onCheckedChange={(checked) => setHashtagForm(prev => ({ ...prev, hasEmail: checked as boolean }))}
                    />
                    <Label htmlFor="hashtag-email">Has Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hashtag-website"
                      checked={hashtagForm.hasWebsite}
                      onCheckedChange={(checked) => setHashtagForm(prev => ({ ...prev, hasWebsite: checked as boolean }))}
                    />
                    <Label htmlFor="hashtag-website">Has Website</Label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Results</label>
                <Select value={hashtagForm.maxResults} onValueChange={(value) => setHashtagForm(prev => ({ ...prev, maxResults: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 profiles</SelectItem>
                    <SelectItem value="50">50 profiles</SelectItem>
                    <SelectItem value="100">100 profiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleHashtagScrape} 
                disabled={isScraping || !hashtagForm.hashtags.trim()}
                className="w-full"
              >
                {isScraping ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape Competitor Followers</CardTitle>
              <CardDescription>
                Find profiles that follow your competitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Competitor Usernames</label>
                <Textarea
                  placeholder="Enter usernames separated by commas (e.g., competitor1, competitor2)"
                  value={competitorForm.competitors}
                  onChange={(e) => setCompetitorForm(prev => ({ ...prev, competitors: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Followers</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={competitorForm.minFollowers}
                    onChange={(e) => setCompetitorForm(prev => ({ ...prev, minFollowers: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Followers</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={competitorForm.maxFollowers}
                    onChange={(e) => setCompetitorForm(prev => ({ ...prev, maxFollowers: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filters</label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="competitor-email"
                      checked={competitorForm.hasEmail}
                      onCheckedChange={(checked) => setCompetitorForm(prev => ({ ...prev, hasEmail: checked as boolean }))}
                    />
                    <Label htmlFor="competitor-email">Has Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="competitor-website"
                      checked={competitorForm.hasWebsite}
                      onCheckedChange={(checked) => setCompetitorForm(prev => ({ ...prev, hasWebsite: checked as boolean }))}
                    />
                    <Label htmlFor="competitor-website">Has Website</Label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Results</label>
                <Select value={competitorForm.maxResults} onValueChange={(value) => setCompetitorForm(prev => ({ ...prev, maxResults: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 profiles</SelectItem>
                    <SelectItem value="50">50 profiles</SelectItem>
                    <SelectItem value="100">100 profiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCompetitorScrape} 
                disabled={isScraping || !competitorForm.competitors.trim()}
                className="w-full"
              >
                {isScraping ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape by Location</CardTitle>
              <CardDescription>
                Find profiles from specific locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Locations</label>
                <Textarea
                  placeholder="Enter locations separated by commas (e.g., New York, Los Angeles, London)"
                  value={locationForm.locations}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, locations: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Followers</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={locationForm.minFollowers}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, minFollowers: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Followers</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={locationForm.maxFollowers}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, maxFollowers: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filters</label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-email"
                      checked={locationForm.hasEmail}
                      onCheckedChange={(checked) => setLocationForm(prev => ({ ...prev, hasEmail: checked as boolean }))}
                    />
                    <Label htmlFor="location-email">Has Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-website"
                      checked={locationForm.hasWebsite}
                      onCheckedChange={(checked) => setLocationForm(prev => ({ ...prev, hasWebsite: checked as boolean }))}
                    />
                    <Label htmlFor="location-website">Has Website</Label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Results</label>
                <Select value={locationForm.maxResults} onValueChange={(value) => setLocationForm(prev => ({ ...prev, maxResults: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 profiles</SelectItem>
                    <SelectItem value="50">50 profiles</SelectItem>
                    <SelectItem value="100">100 profiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleLocationScrape} 
                disabled={isScraping || !locationForm.locations.trim()}
                className="w-full"
              >
                {isScraping ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {scrapedProfiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Scraped Profiles ({scrapedProfiles.length})
            </CardTitle>
            <CardDescription>
              Profiles found from your scraping criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scrapedProfiles.map((profile, index) => {
                const score = calculateProfileScore(profile);
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">@{profile.username}</h3>
                        {profile.isBusiness && <Badge variant="secondary">Business</Badge>}
                        {profile.isPrivate && <Badge variant="outline">Private</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={score >= 70 ? "default" : score >= 50 ? "secondary" : "outline"}>
                          Score: {score}
                        </Badge>
                        <a
                          href={`https://instagram.com/${profile.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Profile
                        </a>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>Followers: {profile.followers.toLocaleString()}</div>
                      <div>Following: {profile.following.toLocaleString()}</div>
                      <div>Posts: {profile.posts.toLocaleString()}</div>
                      <div>Name: {profile.fullName}</div>
                    </div>
                    
                    {profile.bio && (
                      <p className="text-sm text-gray-700 line-clamp-2">{profile.bio}</p>
                    )}
                    
                    <div className="flex gap-2">
                      {profile.hasEmail && <Badge variant="outline" className="text-xs">Email</Badge>}
                      {profile.hasWebsite && <Badge variant="outline" className="text-xs">Website</Badge>}
                      {profile.location && <Badge variant="outline" className="text-xs">{profile.location}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeadScraper;
