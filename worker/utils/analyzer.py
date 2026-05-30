# File analyzer utility
# This module contains the logic for analyzing text content
import time

def analyze_content(content):
    """
    Analyze text content and extract statistics.

    This function:
    1. Receives text content
    2. Counts the number of words
    3. Counts the number of lines
    4. Counts the number of characters
    5. Simulates 15-second processing for demo purposes

    Args:
        content: The text content to analyze

    Returns:
        Dictionary with analysis results:
        {
            'words': int,
            'lines': int,
            'characters': int
        }
    """
    try:
        print(f"[DEBUG] Analyzing content, size: {len(content)} bytes")
        print(f"[DEBUG] Content preview: {content[:100]}")

        # Simulate processing time (15 seconds to demonstrate async processing)
        print(f"[DEBUG] Simulating 15 seconds of processing...")
        time.sleep(15)

        # Count lines
        lines = len(content.split('\n'))

        # Count words
        words = len(content.split())

        # Count characters
        characters = len(content)

        result = {
            'words': words,
            'lines': lines,
            'characters': characters
        }

        print(f"[DEBUG] Analysis result: {result}")
        return result

    except Exception as e:
        print(f"[ERROR] Error analyzing content: {str(e)}")
        raise Exception(f"Error analyzing content: {str(e)}")
