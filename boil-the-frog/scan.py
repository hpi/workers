import subprocess
import cv2
import pytesseract
import argparse
from pytesseract import Output
import re
import os
import numpy as np
from datetime import date
from openai import OpenAI
import json
import base64

ASSISTANT_ID = "asst_7F5yWIbcY3fCykvTsGexJyFQ"

def scan_document(scanner_name, output_file):
    try:
        result = subprocess.run(
            [
                "scanimage",
                "--device",
                scanner_name,
                "--source",
                "ADF",
                "--format",
                "png",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if result.returncode == 0:
            with open(output_file, "wb") as file:
                file.write(result.stdout)
        else:
            print(
                f"Scanimage failed with exit code {result.returncode}: {result.stderr.decode()}"
            )
            exit(result.returncode)
    except subprocess.CalledProcessError as e:
        print(f"An error occurred while scanning: {e}")
        print(f"Error output: {e.stderr.decode()}")

def extract_checked_boxes(image_path, btf_type):
    """
    Analyzes a scanned document using OpenAI's Vision API to identify checked boxes and their associated text.
    
    Args:
        image_path (str): Path to the scanned image file
        btf_type (str): Type of BTF document being analyzed
        
    Returns:
        list: List of dictionaries containing checked items and their details
    """
    # Initialize OpenAI client
    client = OpenAI()
    
    # Read and encode the image
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Prepare the prompt based on document type
    prompt = f"""
    Given the attached image:

    Checklist Checkmarks:

    List all boxes with a pen-written “X” in the box to the left of the task description. Make sure to read the second column as well.

    Below-Line Handwriting:

    Locate the printed phrase:
    Where did I leave off / where should I start tomorrow?

    Extract any handwriting that appears directly beneath that line (within approximately one line of vertical spacing).

    If there is no handwriting immediately below, return "None".

    Locate the printed phrase:
    What would you change:

    Extract any handwriting that appears directly beneath that line (within approximately one line of vertical spacing).

    If there is no handwriting immediately below, return "None".

    Treat all labels as row anchors, not column headers.
    Extract only text that is horizontally aligned with the label—on the same line, not anywhere beneath it.
    """ 
    
    try:
        # Call OpenAI Vision API with gpt-4o and JSON mode
        response = client.responses.create(
            model="gpt-4o",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
                text={
        "format": {
            "type": "json_schema",
            "name": "checked_items",
            "schema": {
                "type": "object",
                "properties": {
                    "checked_items": {
                        "type": "array", 
                        "items": {
                            "type": "string"
                        }
                    },
                    "do_differently": {
                        "type": "string"
                    },
                    "left_off_at": {
                        "type": "string"
                    }
                },
                "required": ["checked_items", "do_differently", "left_off_at"],
                "additionalProperties": False
            },
            "strict": True
        }
                }
        )
        
        # Directly parse the JSON response content
        response_content = response.choices[0].message.content
        try:
            # The response should be a JSON string, load it directly
            parsed_json = json.loads(response_content)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response from OpenAI: {e}")
            print(f"Received content: {response_content}")
            checked_items = []
        except KeyError:
            print(f"Error: 'checked_items' key not found in JSON response: {parsed_json}")
            checked_items = []
            
        return checked_items
        
    except Exception as e:
        print(f"Error analyzing document with OpenAI Vision API: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Scan BTF document in")
    parser.add_argument("type", help="Type of BTF document to print")
    parser.add_argument("scanner_ip", help="IP of the scanner")
    args = parser.parse_args()

    scanner_ip = args.scanner_ip
    btf_type = args.type
    current_date = date.today().strftime("%Y-%m-%d")
    scanner_name = f"airscan:w0:CANON INC. TR4700 series'"
    intermediate_file = f"intermediate-{btf_type}-{current_date}.png"
    output_file = f"scan-{btf_type}-{current_date}.png"

    #scan_document(scanner_name, intermediate_file)
    #corrected_file = rotate_document_if_needed(intermediate_file)
    tasks = extract_checked_boxes("test-this.png", btf_type)
    print("GOT TASKS:", tasks)

if __name__ == "__main__":
    main()

