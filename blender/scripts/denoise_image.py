"""OIDN-denoise an image through Blender's compositor (no scene render involved).

Usage (as a module): denoise(src_path, dst_path) inside Blender, or
  blender -b --factory-startup --python blender/scripts/denoise_image.py -- in.exr out.exr
"""
import bpy, os, sys


def denoise(src, dst, file_format="OPEN_EXR"):
    sc = bpy.context.scene
    img = bpy.data.images.load(src, check_existing=False)
    w, h = img.size
    tree = bpy.data.node_groups.new("Denoise", "CompositorNodeTree")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    n_img = tree.nodes.new("CompositorNodeImage")
    n_img.image = img
    n_dn = tree.nodes.new("CompositorNodeDenoise")
    out = tree.nodes.new("NodeGroupOutput")
    tree.links.new(n_img.outputs["Image"], n_dn.inputs["Image"])
    tree.links.new(n_dn.outputs["Image"], out.inputs[0])
    for k in ("prefilter", "quality"):
        if hasattr(n_dn, k):
            setattr(n_dn, k, {"prefilter": "ACCURATE", "quality": "HIGH"}[k])
    sc.compositing_node_group = tree
    sc.render.use_compositing = True
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    vs = sc.view_settings
    saved = (vs.view_transform, vs.look, vs.exposure)
    vs.view_transform, vs.look, vs.exposure = "Standard", "None", 0.0  # raw data in, raw data out
    sc.render.image_settings.file_format = file_format
    if file_format == "OPEN_EXR":
        sc.render.image_settings.color_depth = "16"
    sc.render.filepath = dst
    bpy.ops.render.render(write_still=True)
    vs.view_transform, vs.look, vs.exposure = saved
    sc.compositing_node_group = None
    bpy.data.node_groups.remove(tree)
    bpy.data.images.remove(img)


if __name__ == "__main__" and "--" in sys.argv:
    a = sys.argv[sys.argv.index("--") + 1:]
    denoise(os.path.abspath(a[0]), os.path.abspath(a[1]), "PNG" if a[1].endswith(".png") else "OPEN_EXR")
