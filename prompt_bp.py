from flask import Blueprint, jsonify, request
from PromptNodes import PromptLoader

prompt_bp = Blueprint("prompt_node", __name__, url_prefix="/prompts")

# Global or app-level tree state. Replace path with your actual JSON file path.
tree_root = PromptLoader()

def _parse_path(raw_path: str) -> list[str]:
    """Helper to convert string paths like 'module/submodule' into path lists."""
    if not raw_path or raw_path.strip() == "/":
        return []
    return [segment for segment in raw_path.strip("/").split("/") if segment]


# --- READ OPERATIONS ---

@prompt_bp.route("/node", methods=["GET"])
@prompt_bp.route("/node/<path:node_path>", methods=["GET"])
def get_node(node_path: str = ""):
    """Gets details of a target node (script, language, leaf status, children count)."""
    path_list = _parse_path(node_path)
    
    if not path_list:
        target_node = tree_root
    else:
        target_node = tree_root.get(path_list)

    if not target_node:
        return jsonify({"error": "Node not found"}), 404

    return jsonify({
        "name": target_node.name,
        "script": target_node.script,
        "language": target_node.language,
        "leaf": target_node.leaf,
        "dead_end": target_node.dead_end,
        "children": target_node.get_children()
    }), 200


@prompt_bp.route("/children", methods=["GET"])
@prompt_bp.route("/children/<path:node_path>", methods=["GET"])
def get_children(node_path: str = ""):
    """Returns a list of direct child names for a given node path."""
    path_list = _parse_path(node_path)
    
    if not path_list:
        return jsonify({"children": tree_root.get_children()}), 200

    target_node = tree_root.get(path_list)
    if not target_node:
        return jsonify({"error": "Node not found"}), 404

    return jsonify({"children": target_node.get_children()}), 200


@prompt_bp.route("/export", methods=["GET"])
def export_tree():
    """Returns the full JSON tree structure."""
    return jsonify(tree_root.getJson()), 200


# --- CREATE OPERATION ---

@prompt_bp.route("/node", methods=["POST"])
@prompt_bp.route("/node/<path:parent_path>", methods=["POST"])
def add_node(parent_path: str = ""):
    """Adds a new child node under parent_path."""
    payload = request.get_json() or {}
    name = payload.get("name")
    script = payload.get("script")

    if not name:
        return jsonify({"error": "'name' is required in payload"}), 400

    path_list = _parse_path(parent_path)
    
    # Use PromptLoader's addPrompt helper method
    tree_root.addPrompt(path=path_list, name=name, script=script)
    tree_root.save()  # Persist changes to JSON storage

    return jsonify({"message": f"Node '{name}' added successfully"}), 201


# --- UPDATE OPERATION ---

@prompt_bp.route("/node/<path:node_path>", methods=["PUT"])
def update_node_script(node_path: str):
    """Updates the script content of a target node."""
    payload = request.get_json() or {}
    new_script = payload.get("script")

    if new_script is None:
        return jsonify({"error": "'script' key is required in payload"}), 400

    path_list = _parse_path(node_path)
    success = tree_root.set(path=path_list, new_script=new_script)

    if not success:
        return jsonify({"error": "Failed to update. Node path not found or dead end."}), 404

    tree_root.save()
    return jsonify({"message": f"Script updated successfully for path '{node_path}'"}), 200


# --- DELETE OPERATION ---

@prompt_bp.route("/node/<path:node_path>", methods=["DELETE"])
def delete_node(node_path: str):
    """Deletes a node specified by node_path."""
    path_list = _parse_path(node_path)

    if not path_list:
        return jsonify({"error": "Cannot delete root node"}), 400

    success = tree_root.delete_child(path=path_list)

    if not success:
        return jsonify({"error": "Node not found or deletion failed"}), 404

    tree_root.save()
    return jsonify({"message": f"Node at '{node_path}' successfully deleted"}), 200