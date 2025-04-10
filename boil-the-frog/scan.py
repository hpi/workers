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

    scan_document(scanner_name, intermediate_file)
    #corrected_file = rotate_document_if_needed(intermediate_file)
    #tasks = extract_checked_boxes(intermediate_file, btf_type)

    #   print("GOT TASKS:", tasks)

if __name__ == "__main__":
    main()

