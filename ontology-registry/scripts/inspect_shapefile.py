import sys
from collections import Counter
from itertools import islice
from pathlib import Path

import shapefile

path = Path(sys.argv[1])
reader = shapefile.Reader(str(path))
fields = [field[0] for field in reader.fields[1:]]
print("file:", path.name)
print("features:", len(reader))
print("fields:", fields)
print("shape_types:", Counter(shape.shapeType for shape in reader.shapes()))
for record in islice(reader.iterRecords(), 5):
    print("sample:", dict(zip(fields, list(record))))
