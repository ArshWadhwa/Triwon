import { Logger } from '../utils/logger.ts';

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  created_at: string;
  permalink: string;
  post_type: 'text' | 'link' | 'image';
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  created_at: string;
  post_id: string;
}

export interface RedditConfig {
  subreddit?: string;
  keywords?: string;
  title?: string;
  text?: string;
  url?: string;
  post_id?: string;
  comment_text?: string;
  vote_direction?: 1 | 0 | -1;
  min_score?: number;
  time_filter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

export class RedditService {
  private baseUrl = 'https://oauth.reddit.com';
  private userAgent = 'AutoFlow:v1.0.0 (by /u/autoflow-app)';

  constructor(private supabase: any, private logger: Logger) {
    this.logger.info('RedditService initialized');
  }

  async getIntegration(userId: string): Promise<any> {
    try {
      this.logger.info(`Getting Reddit integration for user: ${userId}`);
      
      const { data, error } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('service_name', 'reddit')
        .single();

      if (error) {
        this.logger.error('Error fetching Reddit integration:', error);
        throw new Error(`Reddit integration not found: ${error.message}`);
      }

      if (!data) {
        throw new Error('Reddit integration not found for user');
      }

      this.logger.info('Reddit integration found successfully');
      return data;
    } catch (error) {
      this.logger.error('Error in getIntegration:', error);
      throw error;
    }
  }

  async refreshAccessToken(integration: any): Promise<string> {
    try {
      this.logger.info('Refreshing Reddit access token');
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('REDDIT_CLIENT_ID')}:${Deno.env.get('REDDIT_CLIENT_SECRET')}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const tokenData = await response.json();
      
      await this.supabase
        .from('integrations')
        .update({
          access_token: tokenData.access_token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      this.logger.info('Reddit access token refreshed successfully');
      return tokenData.access_token;
    } catch (error) {
      this.logger.error('Error refreshing Reddit token:', error);
      throw error;
    }
  }

  async makeRequest(endpoint: string, accessToken: string, method = 'GET', body?: any): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent,
        },
      };

      if (body && method !== 'GET') {
        if (method === 'POST' && endpoint.includes('/api/')) {
          options.headers = {
            ...options.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          };
          options.body = new URLSearchParams(body).toString();
        } else {
          options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
          };
          options.body = JSON.stringify(body);
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Reddit API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Error making Reddit request to ${endpoint}:`, error);
      throw error;
    }
  }

  async isPostProcessed(userId: string, postId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('reddit_processed_posts')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  async markPostProcessed(userId: string, postId: string, subreddit: string): Promise<void> {
    try {
      await this.supabase
        .from('reddit_processed_posts')
        .insert({
          user_id: userId,
          post_id: postId,
          subreddit: subreddit,
        });
    } catch (error) {
      this.logger.error('Error marking post as processed:', error);
    }
  }

  async getNewPosts(userId: string, config: RedditConfig): Promise<RedditPost[]> {
    try {
      this.logger.info(`Getting new posts for subreddit: ${config.subreddit}`);
      
      const integration = await this.getIntegration(userId);
      let accessToken = integration.access_token;

      const executeRequest = async (token: string) => {
        const endpoint = `/r/${config.subreddit}/new.json?limit=25`;
        const response = await this.makeRequest(endpoint, token);
        
        const allPosts: RedditPost[] = response.data.children.map((child: any) => ({
          id: child.data.id,
          title: child.data.title,
          content: child.data.selftext || '',
          url: child.data.url,
          author: child.data.author,
          subreddit: child.data.subreddit,
          score: child.data.score,
          created_at: new Date(child.data.created_utc * 1000).toISOString(),
          permalink: `https://reddit.com${child.data.permalink}`,
          post_type: child.data.is_self ? 'text' : (child.data.post_hint === 'image' ? 'image' : 'link'),
        }));

        // Filter out already processed posts
        const newPosts: RedditPost[] = [];
        for (const post of allPosts) {
          const isProcessed = await this.isPostProcessed(userId, post.id);
          if (!isProcessed) {
            newPosts.push(post);
            await this.markPostProcessed(userId, post.id, post.subreddit);
          }
        }

        return newPosts;
      };

      try {
        const newPosts = await executeRequest(accessToken);
        
        // Apply filters
        let filteredPosts = newPosts;

        if (config.keywords) {
          const keywords = config.keywords.toLowerCase().split(',').map(k => k.trim());
          filteredPosts = filteredPosts.filter(post => 
            keywords.some(keyword => 
              post.title.toLowerCase().includes(keyword) || 
              post.content.toLowerCase().includes(keyword)
            )
          );
        }

        if (config.min_score) {
          filteredPosts = filteredPosts.filter(post => post.score >= config.min_score);
        }

        this.logger.info(`Found ${filteredPosts.length} new posts matching criteria`);
        return filteredPosts;

      } catch (apiError) {
        this.logger.info('Refreshing Reddit access token and retrying...');
        accessToken = await this.refreshAccessToken(integration);
        return await executeRequest(accessToken);
      }
    } catch (error) {
      this.logger.error('Error getting Reddit posts:', error);
      throw error;
    }
  }

  async createPost(userId: string, config: RedditConfig): Promise<any> {
    try {
      this.logger.info(`Creating post in subreddit: ${config.subreddit}`);
      
      const integration = await this.getIntegration(userId);
      const accessToken = integration.access_token;

      const postData: any = {
        sr: config.subreddit,
        kind: config.url ? 'link' : 'self',
        title: config.title,
        api_type: 'json',
      };

      if