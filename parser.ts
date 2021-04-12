const request = require("request-promise");
const cheerio = require("cheerio");
const fs = require("fs");
const writeStream = fs.createWriteStream("quotes.csv");
interface ProductInfo {
  precio: number;
  titulo: string;
  link: string;
}

type ProductID = string;
let link: string =
  "https://listado.mercadolibre.com.ar/microfono-behringer-c1u#D[A:microfono%20behringer%20c1u]";
let rawdata = fs.readFileSync("listado.json");
let dataOriginal = JSON.parse(rawdata);

let archivo = new Map<string, Map<string, ProductInfo>>(
  Object.entries(dataOriginal)
);
var listado = new Map<string, ProductInfo>();

function añadirProducto(producto: ProductInfo) {
  if (listado.has(producto.link)) {
    if (listado.get(producto.link)!.precio < producto.precio) {
      console.log(
        "bajó el precio de ",
        listado.get(producto.link)!.precio,
        "a ",
        producto.precio
      );
    }
  }
  listado.set(producto.link, producto);
}
async function init() {
  try {
    const $ = await request({
      uri: link,
      transform: (body: any) => cheerio.load(body),
    });
    $(".ui-search-result__content-wrapper").each(
      (index: number, element: any) => {
        var producto: ProductInfo = { precio: 0, link: "", titulo: "" };
        producto.precio = Number(
          $(element)
            .find(".price-tag-fraction")
            .text()
            .replace(/ \s\s+/g, "")
        );
        producto.titulo = $(element)
          .find(".ui-search-item__title")
          .text()
          .replace(/ \s\s+/g, "");
        producto.link = $(element).find("a").attr("href");
        var descontado = $(element).find(".ui-search-price__second-line");
        if (descontado != undefined) {
          producto.precio = $(descontado)
            .find(".price-tag-fraction")
            .text()
            .replace(/ \s\s+/g, "");
        }

        añadirProducto(producto);
      }
    );

    archivo.set(link, listado);

    const toObject: any = (map = new Map()) =>
      Object.fromEntries(
        Array.from(map.entries(), ([k, v]) =>
          v instanceof Map ? [k, toObject(v)] : [k, v]
        )
      );
    var obj = toObject(archivo);

    const jsonString = JSON.stringify(obj);

    fs.writeFile("./listado.json", jsonString, (err: any) => {
      if (err) {
        console.log("Error writing file", err);
      } else {
        console.log("Successfully wrote file");
      }
    });

    console.log("Done.");
  } catch (e) {
    console.log(e);
  }
}

init();
