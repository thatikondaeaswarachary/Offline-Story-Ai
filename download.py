from huggingface_hub import snapshot_download
import os

repo_id = "mlc-ai/SmolLM2-135M-Instruct-q0f16-MLC"
local_dir = os.path.join("public", "models", "SmolLM2-135M-Instruct-q0f16-MLC")

print(f"Downloading {repo_id} to {local_dir}...")
snapshot_download(
    repo_id=repo_id,
    local_dir=local_dir,
    local_dir_use_symlinks=False
)
print("Download complete!")
