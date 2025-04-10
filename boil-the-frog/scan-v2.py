import cv2
import numpy as np
import pytesseract
from PIL import Image

def align_page(image_path):
  # Load the image
  image = cv2.imread(image_path)
  grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

  # Detect edges
  edges = cv2.Canny(grayscale, 50, 150, apertureSize=3)

  cv2.imwrite('edged.png', edges)
  # Find contours
  contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

  leftmost = (np.inf, 0)
  rightmost = (-np.inf, 0)
  bottommost = (0, -np.inf)
  # Go through all contours to find the most extreme points
  for cnt in contours:
    # Get the bounding box of the contour
    x, y, w, h = cv2.boundingRect(cnt)
    # Update the extreme points
    if x < leftmost[0]:
      leftmost = (x, y)
    # 400 is magic number for height
    if x + w > rightmost[0]:
      rightmost = (x + w, y)
    if y + h > bottommost[1]:
      bottommost = (x, y + h)

  # Calculate the angle using the top two extreme points
  delta_x = rightmost[0] - leftmost[0]
  delta_y = rightmost[1] - leftmost[1]
  angle = (np.arctan2(delta_y, delta_x) * 180.0 / np.pi)

  # Check if the page is upside down
  if bottommost[0] - leftmost[0] < 5:
    angle = 180

  # Get the rotation matrix and rotate the image
  center_of_rotation = tuple(np.array(image.shape[1::-1]) / 2)
  rotation_matrix = cv2.getRotationMatrix2D(center_of_rotation, angle, 1.0)
  rotated_image = cv2.warpAffine(image, rotation_matrix, image.shape[1::-1], flags=cv2.INTER_LINEAR)

  cv2.imwrite('rotated.png', rotated_image)

  return rotated_image

def main(image_path):
  rotated_image = align_page(image_path)

if __name__ == "__main__":
  image_path = "btf.png"
  main(image_path)

