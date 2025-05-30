import subprocess
import os
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

def extract_checked_boxes(image_path):
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

    #print("BASE64 IMAGE:", base64_image)
    # Prepare the prompt based on document type
    prompt = f"""
    Given the attached image:

    Chores Checkmarks:

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

    If the document has a "What would you change" section, return "eod" as the btf_type, otherwise return "sod".

    If the btf_type is sod, there will also be a section headed as "Tasks", each row is a new task. Tell me what tasks are checked off as well, make sure that the pen marked X is on the same row as the task.
    """ 
    
    try:
        # Call OpenAI Vision API with gpt-4o and JSON mode
        response = client.responses.create(
            model="gpt-4.1",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": f"data:image/png;base64,{base64_image}"
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
                    "chores": {
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
                    },
                    "btf_type": {   
                        "type": "string"
                    },
                    "tasks": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },
                "required": ["chores", "do_differently", "left_off_at", "btf_type", "tasks"],
                "additionalProperties": False
            },
            "strict": True
        }
                }
        )
        try:
            output = json.loads(response.output[0].content[0].text)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response from OpenAI: {e}")
            print(f"Received content: {output}")
        except KeyError:
            print(f"Error: 'checked_items' key not found in JSON response: {output}")
            
        return output
        
    except Exception as e:
        print(f"Error analyzing document with OpenAI Vision API: {e}")
        return []

def main():
    current_date = date.today().strftime("%Y-%m-%d-%H-%M-%S")
    scanner_name = f"airscan:w0:CANON INC. TR4700 series'"
    intermediate_file = os.path.join(os.path.dirname(__file__), f"intermediate-{current_date}.png")

    scan_document(scanner_name, intermediate_file)
    results = extract_checked_boxes(intermediate_file)
    print(results)
if __name__ == "__main__":
    main()

