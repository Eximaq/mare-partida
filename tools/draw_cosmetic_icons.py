"""Draw the four original inventory icons for the Dawn wardrobe."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets/ui/cosmetics/east-blue"
DENSITY = 4
SIZE = 80 * DENSITY


class IconBrush:
    """Rasterize the drawing coordinates directly into the 320 px source."""

    def __init__(self, image):
        self.target = ImageDraw.Draw(image)

    @staticmethod
    def scale(coordinates):
        if isinstance(coordinates[0], (list, tuple)):
            return [(round(x * DENSITY), round(y * DENSITY)) for x, y in coordinates]
        return tuple(round(value * DENSITY) for value in coordinates)

    def polygon(self, points, **style):
        self.target.polygon(self.scale(points), **style)

    def line(self, points, *, width=1, **style):
        self.target.line(self.scale(points), width=round(width * DENSITY), **style)

    def arc(self, bounds, start, end, *, width=1, **style):
        self.target.arc(self.scale(bounds), start, end, width=round(width * DENSITY), **style)

    def rectangle(self, bounds, **style):
        self.target.rectangle(self.scale(bounds), **style)

    def point(self, point, **style):
        x, y = point
        self.rectangle((x, y, x + .5, y + .5), **style)


def canvas():
    image = Image.new("RGBA", (SIZE, SIZE))
    return image, IconBrush(image)


def path(draw, points, fill, edge, width=2):
    draw.polygon(points, fill=fill)
    draw.line([*points, points[0]], fill=edge, width=width, joint="curve")


def straw_hat():
    image, draw = canvas()
    edge = "#372720"
    path(draw, [(6,52),(8,47),(17,41),(34,37),(53,38),(68,43),(74,49),(73,55),(63,61),(50,64),(26,63),(12,59)], "#a16a36", edge)
    path(draw, [(7,48),(15,43),(30,39),(53,39),(68,44),(74,50),(66,55),(51,58),(26,57),(13,54)], "#e0b66b", edge)
    draw.arc((12,40,68,54), 0, 180, fill="#f4d18b", width=2)
    draw.arc((10,44,70,56), 0, 180, fill="#c38b43", width=1)
    path(draw, [(21,45),(24,29),(30,21),(38,17),(49,18),(57,23),(61,32),(62,45),(55,50),(37,53),(26,50)], "#daa450", edge)
    draw.polygon([(25,30),(32,22),(40,19),(48,20),(55,24),(50,28),(32,29)], fill="#f0ce83")
    draw.polygon([(53,26),(58,32),(59,43),(55,45),(51,43)], fill="#be873e")
    for y in (31, 35, 39):
        for x in range(29 + y % 3, 54, 5):
            draw.line((x,y,x+2,y-1), fill="#bd893e", width=.5)
            draw.line((x+.5,y+.6,x+2.5,y-.4), fill="#edc87d", width=.25)
    path(draw, [(22,39),(31,43),(42,45),(55,43),(61,40),(62,45),(55,49),(41,51),(28,49),(21,45)], "#983743", "#572d31", 1)
    draw.line([(23,40),(31,44),(42,46),(54,44),(59,42)], fill="#df6556", width=2)
    for x in (13, 19, 25, 52, 59, 64, 69):
        draw.line((x,53,x+2,54), fill="#a67036")
    return image


def scarlet_vest():
    image, draw = canvas()
    edge = "#39242c"
    path(draw, [(22,12),(34,11),(40,18),(48,11),(60,15),(67,22),(60,37),(62,62),(68,68),(53,73),(27,72),(15,67),(19,60),(20,38),(13,25)], "#801f35", edge)
    path(draw, [(22,14),(31,12),(36,23),(36,33),(32,48),(32,64),(36,69),(20,67),(23,61),(24,37),(17,25)], "#c93746", edge, 1)
    path(draw, [(48,13),(59,16),(64,23),(57,36),(59,60),(65,67),(51,71),(43,67),(46,57),(46,45),(43,33),(44,23)], "#b02b3d", edge, 1)
    draw.polygon([(33,13),(40,19),(47,13),(43,23),(40,29),(37,24)], fill="#39242c")
    draw.polygon([(37,24),(40,29),(44,22),(43,33),(46,45),(44,59),(43,66),(38,68),(33,64),(34,51),(37,38)], fill=(0,0,0,0))
    draw.line([(19,26),(24,17),(29,15),(33,23),(34,34),(30,48),(28,62)], fill="#fa7866", width=2)
    draw.line([(48,16),(52,18),(49,28),(50,45),(50,59),(54,68)], fill="#ec594f", width=2)
    draw.line([(27,22),(26,29),(28,43),(25,57)], fill="#9b2937", width=.5)
    draw.line([(56,23),(54,31),(55,43),(56,57)], fill="#8d2338", width=.5)
    for y in (42, 51, 60):
        draw.rectangle((52,y,55,y+2), fill="#dfb565")
        draw.point((52,y), fill="#fff0a1")
    draw.line([(18,66),(26,69),(35,69)], fill="#ee6251", width=2)
    draw.line([(48,68),(53,70),(64,67)], fill="#d34b46")
    return image


def indigo_shorts():
    image, draw = canvas()
    edge = "#202637"
    path(draw, [(19,16),(28,14),(50,14),(61,16),(64,26),(64,40),(69,61),(66,69),(49,71),(42,62),(39,48),(35,64),(29,70),(12,67),(10,61),(15,40),(15,26)], "#355483", edge)
    draw.polygon([(20,19),(32,18),(30,37),(25,57),(16,60),(17,41),(18,29)], fill="#5175a4")
    draw.polygon([(46,20),(55,19),(60,25),(59,40),(65,60),(54,61),(48,49),(43,34)], fill="#426997")
    draw.line([(18,25),(27,29),(34,27),(36,22)], fill="#253852", width=2)
    draw.line([(62,25),(55,29),(49,27),(47,22)], fill="#253852", width=2)
    draw.line([(40,18),(39,26),(41,34),(38,41)], fill="#24344e", width=2)
    draw.line([(19,19),(28,17),(50,17),(61,20)], fill="#7191b6", width=2)
    path(draw, [(13,58),(17,60),(28,63),(36,59),(35,66),(29,70),(13,67),(10,64)], "#92a8bd", edge, 1)
    path(draw, [(43,59),(50,63),(60,62),(67,58),(69,63),(66,69),(50,71),(45,66)], "#91a7ba", edge, 1)
    draw.line([(12,61),(19,64),(28,66),(35,63)], fill="#ccd2cf")
    draw.line([(45,62),(50,66),(60,65),(67,62)], fill="#c7d1d0")
    return image


def sandals():
    image, draw = canvas()
    edge = "#33242a"
    for dx, dy in ((0, 5), (26, -7)):
        def shifted(points):
            return [(x+dx,y+dy) for x,y in points]
        path(draw, shifted([(10,55),(12,45),(20,31),(27,23),(35,21),(41,23),(44,29),(43,40),(38,50),(32,59),(26,65),(20,67),(14,64)]), "#825235", edge)
        path(draw, shifted([(12,54),(14,46),(23,31),(29,25),(36,23),(41,25),(42,32),(38,43),(33,51),(27,60),(20,62),(15,59)]), "#d19c5d", "#5c3b31", 1)
        draw.line(shifted([(14,53),(16,46),(23,34),(31,26),(36,25)]), fill="#edc77f", width=2)
        for x,y in ((17,53),(20,48),(27,40),(33,35),(34,30),(19,58),(30,51)):
            draw.line(shifted([(x,y),(x+3,y+1)]), fill="#a87544")
        path(draw, shifted([(16,45),(20,38),(32,44),(36,45),(33,51),(26,49)]), "#604139", edge, 1)
        path(draw, shifted([(20,54),(23,56),(36,38),(40,34),(41,29),(37,29),(29,39)]), "#775043", edge, 1)
        draw.line(shifted([(23,53),(29,44),(36,36),(39,33)]), fill="#ae7350", width=2)
        draw.point((29+dx,44+dy), fill="#e7be73")
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, paint in (("hat", straw_hat), ("vest", scarlet_vest), ("shorts", indigo_shorts), ("sandals", sandals)):
        paint().save(OUT / (name + ".png"), optimize=True)


if __name__ == "__main__":
    main()
