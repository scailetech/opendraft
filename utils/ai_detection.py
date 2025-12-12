#!/usr/bin/env python3
"""
ABOUTME: AI detection utility using GPTZero API to check AI-generated content score
ABOUTME: Helps ensure writing appears natural and human-authored (< 20% AI score target)
"""

import argparse
import os
import sys
import json

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("ERROR: requests library not installed. Run: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def check_ai_score(text, api_key=None):
    """
    Check AI detection score using GPTZero API
    Returns score between 0 (human) and 1 (AI)
    """
    if not api_key:
        api_key = os.getenv('GPTZERO_API_KEY')
    
    if not api_key:
        print("ERROR: GPTZero API key not found")
        print("Set GPTZERO_API_KEY in .env file or pass with --api-key")
        return None
    
    url = "https://api.gptzero.me/v2/predict/text"
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    
    data = {
        'document': text
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            print(f"ERROR: API returned status {response.status_code}")
            print(response.text)
            return None
    
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def analyze_file(file_path, api_key=None, verbose=False):
    """Analyze a file for AI-generated content"""
    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}")
        return None
    
    # Read file
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Check length
    word_count = len(text.split())
    if word_count < 50:
        print("WARNING: Text too short for accurate detection (< 50 words)")
    
    print(f"Analyzing: {file_path}")
    print(f"Word count: {word_count}")
    print("Checking AI score... (this may take 10-30 seconds)")
    
    # Get AI score
    result = check_ai_score(text, api_key)
    
    if not result:
        return None
    
    # Extract scores
    ai_probability = result.get('documents', [{}])[0].get('completely_generated_prob', 0)
    class_label = result.get('documents', [{}])[0].get('class_label', 'unknown')
    
    # Display results
    print("\n" + "="*50)
    print("AI DETECTION RESULTS")
    print("="*50)
    print(f"AI Probability: {ai_probability:.1%}")
    print(f"Classification: {class_label.upper()}")
    
    # Risk assessment
    if ai_probability < 0.20:
        risk = "LOW ✅ (Appears human-written)"
    elif ai_probability < 0.50:
        risk = "MODERATE ⚠️ (Mixed/uncertain)"
    else:
        risk = "HIGH 🔴 (Likely AI-generated)"
    
    print(f"Risk Level: {risk}")
    print("="*50)
    
    # Recommendations
    if ai_probability > 0.20:
        print("\n💡 Recommendations:")
        print("1. Run Entropy Agent to increase natural variation")
        print("2. Add more of your own voice using Voice Agent")
        print("3. Manually edit sections with highest AI signals")
        print("4. Vary sentence structure and length")
    
    # Verbose output
    if verbose and 'documents' in result:
        print("\nDetailed Analysis:")
        print(json.dumps(result['documents'][0], indent=2))
    
    return {
        'ai_probability': ai_probability,
        'class_label': class_label,
        'word_count': word_count
    }


def main():
    parser = argparse.ArgumentParser(
        description='Check AI-generated content score',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Check single file
  python ai_detection.py final_draft.md
  
  # Check with custom API key
  python ai_detection.py paper.md --api-key your_key_here
  
  # Verbose output
  python ai_detection.py paper.md --verbose
  
Note: Requires GPTZero API key in .env file or via --api-key
Free tier: 5,000 words/month
Get key at: https://gptzero.me/
        '''
    )
    parser.add_argument('file', help='File to analyze')
    parser.add_argument('--api-key', help='GPTZero API key (or set GPTZERO_API_KEY in .env)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    result = analyze_file(args.file, args.api_key, args.verbose)
    
    if not result:
        sys.exit(1)
    
    # Exit code based on risk level
    if result['ai_probability'] > 0.50:
        sys.exit(2)  # High risk
    elif result['ai_probability'] > 0.20:
        sys.exit(1)  # Moderate risk
    else:
        sys.exit(0)  # Low risk


if __name__ == '__main__':
    main()
