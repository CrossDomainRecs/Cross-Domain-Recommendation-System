"""
RecLab Data Filtering Pipeline
Filters Amazon reviews based on Option C strategy
"""

import json
import gzip
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict
from tqdm import tqdm
import sys

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

from src.utils.logger import setup_logger
from src.utils.config import RAW_DATA_DIR, PROCESSED_DATA_DIR

# Setup logger
logger = setup_logger('data_filter', 'data_filtering.log')


class DataFilter:
    """
    Filters Amazon review data based on quality criteria
    """
    
    def __init__(self, config):
        self.config = config
        self.stats = defaultdict(lambda: defaultdict(int))
        
    def should_keep_review(self, review, domain):
        """
        Determine if review should be kept based on filtering criteria
        
        Args:
            review: Review dictionary
            domain: Domain name (books, movies, music)
        
        Returns:
            bool: True if review should be kept
        """
        criteria = self.config[domain]
        
        # Check timestamp (year)
        try:
            timestamp_ms = review.get('timestamp', 0)
            review_date = datetime.fromtimestamp(timestamp_ms / 1000)
            if review_date.year < criteria['start_year']:
                self.stats[domain]['filtered_old_date'] += 1
                return False
        except (ValueError, OSError):
            self.stats[domain]['filtered_invalid_date'] += 1
            return False
        
        # Check verified purchase (if required)
        if criteria.get('verified_purchase', False):
            if not review.get('verified_purchase', False):
                self.stats[domain]['filtered_not_verified'] += 1
                return False
        
        # Check text length
        text_length = len(review.get('text', ''))
        if text_length < criteria['min_text_length']:
            self.stats[domain]['filtered_short_text'] += 1
            return False
        
        # Check rating validity
        rating = review.get('rating', 0)
        if rating < 1 or rating > 5:
            self.stats[domain]['filtered_invalid_rating'] += 1
            return False
        
        self.stats[domain]['kept'] += 1
        return True
    
    def filter_by_user_activity(self, reviews, min_reviews):
        """
        Filter reviews to keep only active users
        
        Args:
            reviews: List of review dictionaries
            min_reviews: Minimum number of reviews per user
        
        Returns:
            List of filtered reviews
        """
        # Count reviews per user
        user_counts = Counter(r['user_id'] for r in reviews)
        
        # Keep only users with sufficient activity
        active_users = {user for user, count in user_counts.items() 
                       if count >= min_reviews}
        
        filtered = [r for r in reviews if r['user_id'] in active_users]
        
        removed = len(reviews) - len(filtered)
        logger.info(f"Filtered {removed:,} reviews from inactive users")
        logger.info(f"Active users: {len(active_users):,} / {len(user_counts):,}")
        
        return filtered
    
    def filter_by_item_popularity(self, reviews, min_reviews):
        """
        Filter reviews to keep only items with sufficient reviews
        
        Args:
            reviews: List of review dictionaries
            min_reviews: Minimum number of reviews per item
        
        Returns:
            List of filtered reviews
        """
        # Count reviews per item
        item_counts = Counter(r['parent_asin'] for r in reviews)
        
        # Keep only items with sufficient reviews
        popular_items = {item for item, count in item_counts.items() 
                        if count >= min_reviews}
        
        filtered = [r for r in reviews if r['parent_asin'] in popular_items]
        
        removed = len(reviews) - len(filtered)
        logger.info(f"Filtered {removed:,} reviews from unpopular items")
        logger.info(f"Popular items: {len(popular_items):,} / {len(item_counts):,}")
        
        return filtered
    
    def process_domain(self, domain_name, input_file, output_file):
        """
        Process single domain's reviews
        
        Args:
            domain_name: Domain name (books, movies, music)
            input_file: Path to input JSONL file
            output_file: Path to output JSONL file
        """
        logger.info(f"Processing {domain_name}...")
        logger.info(f"Input: {input_file}")
        logger.info(f"Output: {output_file}")
        
        # Reset stats for this domain
        self.stats[domain_name] = defaultdict(int)
        
        # First pass: filter by quality criteria
        logger.info("Pass 1: Filtering by quality criteria...")
        filtered_reviews = []
        
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in tqdm(f, desc=f"Filtering {domain_name}"):
                try:
                    review = json.loads(line.strip())
                    self.stats[domain_name]['total'] += 1
                    
                    if self.should_keep_review(review, domain_name):
                        filtered_reviews.append(review)
                        
                except json.JSONDecodeError:
                    self.stats[domain_name]['json_errors'] += 1
                    continue
        
        logger.info(f"After quality filter: {len(filtered_reviews):,} reviews")
        
        # Second pass: filter by user activity
        logger.info("Pass 2: Filtering by user activity...")
        criteria = self.config[domain_name]
        filtered_reviews = self.filter_by_user_activity(
            filtered_reviews, 
            criteria['min_user_reviews']
        )
        
        # Third pass: filter by item popularity
        logger.info("Pass 3: Filtering by item popularity...")
        filtered_reviews = self.filter_by_item_popularity(
            filtered_reviews,
            criteria['min_item_reviews']
        )
        
        # Save filtered reviews
        logger.info(f"Saving {len(filtered_reviews):,} filtered reviews...")
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for review in tqdm(filtered_reviews, desc="Writing"):
                f.write(json.dumps(review) + '\n')
        
        # Log statistics
        self._log_statistics(domain_name, filtered_reviews)
        
        return filtered_reviews
    
    def _log_statistics(self, domain_name, reviews):
        """Log filtering statistics"""
        stats = self.stats[domain_name]
        
        logger.info(f"\n{'='*60}")
        logger.info(f"{domain_name.upper()} FILTERING STATISTICS")
        logger.info(f"{'='*60}")
        logger.info(f"Total reviews: {stats['total']:,}")
        logger.info(f"Kept reviews: {len(reviews):,}")
        logger.info(f"Retention rate: {len(reviews)/stats['total']*100:.2f}%")
        logger.info(f"\nFiltered out:")
        logger.info(f"  - Old dates: {stats['filtered_old_date']:,}")
        logger.info(f"  - Not verified: {stats['filtered_not_verified']:,}")
        logger.info(f"  - Short text: {stats['filtered_short_text']:,}")
        logger.info(f"  - Invalid rating: {stats['filtered_invalid_rating']:,}")
        logger.info(f"  - Invalid date: {stats['filtered_invalid_date']:,}")
        logger.info(f"  - JSON errors: {stats['json_errors']:,}")
        
        # Calculate final statistics
        unique_users = len(set(r['user_id'] for r in reviews))
        unique_items = len(set(r['parent_asin'] for r in reviews))
        
        logger.info(f"\nFinal dataset:")
        logger.info(f"  - Unique users: {unique_users:,}")
        logger.info(f"  - Unique items: {unique_items:,}")
        logger.info(f"  - Avg reviews/user: {len(reviews)/unique_users:.2f}")
        logger.info(f"  - Avg reviews/item: {len(reviews)/unique_items:.2f}")
        logger.info(f"{'='*60}\n")
    
    def process_metadata(self, domain_name, input_file, output_file, kept_asins):
        """
        Process metadata file - keep only items that exist in filtered reviews
        
        Args:
            domain_name: Domain name
            input_file: Path to input metadata file
            output_file: Path to output metadata file
            kept_asins: Set of ASINs to keep
        """
        logger.info(f"Processing {domain_name} metadata...")
        logger.info(f"Keeping metadata for {len(kept_asins):,} items")
        
        kept_metadata = []
        
        # Determine if file is gzipped
        is_gzipped = input_file.suffix == '.gz'
        open_func = gzip.open if is_gzipped else open
        mode = 'rt' if is_gzipped else 'r'
        
        with open_func(input_file, mode, encoding='utf-8') as f:
            for line in tqdm(f, desc=f"Filtering {domain_name} metadata"):
                try:
                    metadata = json.loads(line.strip())
                    asin = metadata.get('parent_asin')
                    
                    if asin in kept_asins:
                        kept_metadata.append(metadata)
                        
                except json.JSONDecodeError:
                    continue
        
        # Save filtered metadata
        logger.info(f"Saving {len(kept_metadata):,} metadata records...")
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for metadata in tqdm(kept_metadata, desc="Writing metadata"):
                f.write(json.dumps(metadata) + '\n')
        
        logger.info(f"Metadata coverage: {len(kept_metadata)/len(kept_asins)*100:.2f}%\n")


def main():
    """Main filtering pipeline"""
    
    # Filtering configuration (Option A - Balanced approach)
    CONFIG = {
        'books': {
            'min_user_reviews': 3,      # Active users
            'min_item_reviews': 5,      # Popular items
            'verified_purchase': False, # Only 31% verified
            'start_year': 2020,         # Recent data
            'min_text_length': 50       # Quality reviews
        },
        'movies': {
            'min_user_reviews': 3,      # Active users
            'min_item_reviews': 3,      # Popular items
            'verified_purchase': True,  # 79% verified
            'start_year': 2020,         # Recent data
            'min_text_length': 20       # Shorter is okay
        },
        'music': {
            'min_user_reviews': 2,      # Very sparse, be lenient
            'min_item_reviews': 2,      # Small dataset
            'verified_purchase': True,  # 78% verified
            'start_year': 2018,         # Go back further
            'min_text_length': 10       # Short reviews common
        }
    }
    
    # Initialize filter
    data_filter = DataFilter(CONFIG)
    
    # Domain configurations
    domains = {
        'books': {
            'reviews': 'Books.jsonl',
            'metadata': 'meta_Books.jsonl'
        },
        'movies': {
            'reviews': 'Movies_and_TV.jsonl',
            'metadata': 'meta_Movies_and_TV.jsonl'
        },
        'music': {
            'reviews': 'Digital_Music.jsonl',
            'metadata': 'meta_Digital_Music.jsonl'
        }
    }
    
    logger.info("="*60)
    logger.info("RECLAB DATA FILTERING PIPELINE")
    logger.info("="*60)
    logger.info(f"Configuration: {json.dumps(CONFIG, indent=2)}")
    logger.info("="*60 + "\n")
    
    # Process each domain
    for domain_name, files in domains.items():
        # Process reviews
        input_file = RAW_DATA_DIR / files['reviews']
        output_file = PROCESSED_DATA_DIR / f"{domain_name}_reviews_filtered.jsonl"
        
        filtered_reviews = data_filter.process_domain(
            domain_name,
            input_file,
            output_file
        )
        
        # Get unique ASINs from filtered reviews
        kept_asins = set(r['parent_asin'] for r in filtered_reviews)
        
        # Process metadata
        metadata_file = RAW_DATA_DIR / files['metadata']
        output_metadata = PROCESSED_DATA_DIR / f"{domain_name}_metadata.jsonl"
        
        data_filter.process_metadata(
            domain_name,
            metadata_file,
            output_metadata,
            kept_asins
        )
    
    # Save overall statistics
    stats_file = PROCESSED_DATA_DIR / 'filtering_stats.json'
    with open(stats_file, 'w') as f:
        json.dump(dict(data_filter.stats), f, indent=2)
    
    logger.info("="*60)
    logger.info("FILTERING PIPELINE COMPLETE!")
    logger.info(f"Statistics saved to: {stats_file}")
    logger.info("="*60)


if __name__ == '__main__':
    main()
