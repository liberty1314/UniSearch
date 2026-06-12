import os

target_plugins = [
    "api52"
]
targets = [f'unisearch/plugin/{p}"' for p in target_plugins]

backend_dir = "/Users/abner/Desktop/MyProject/UniSearch_dev/backend"

for root, _, files in os.walk(backend_dir):
    for file in files:
        if file.endswith(".go"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            new_lines = []
            changed = False
            for line in lines:
                should_remove = any(t in line for t in targets)
                if should_remove:
                    changed = True
                    continue
                new_lines.append(line)
                
            if changed:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                print(f"Updated {file_path}")
