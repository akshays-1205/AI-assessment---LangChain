import os
from datetime import datetime

def save_assessment_data(session_id, summary, history):
    """
    Saves the resume summary and Q&A history to a text file.
    """
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    file_path = os.path.join(output_dir, f"assessment_{timestamp}.txt")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("RESUME SUMMARY\n")
        f.write("==============\n")
        f.write(summary)
        f.write("\n\n")
        
        f.write("QUESTIONS AND ANSWERS\n")
        f.write("=====================\n")
        for i, entry in enumerate(history, 1):
            f.write(f"Q{i}: {entry['question']}\n")
            f.write(f"A{i}: {entry['answer']}\n")
            f.write("-" * 20 + "\n")
            
    return file_path
