
import { useEffect, useMemo, useState } from "react";

// ========================================
// CONFIGURAÇÕES
// ========================================

const API = "https://pokeapi.co/api/v2";
const TOTAL_POKEMON = 1025;

const SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

// Ordem de prioridade das imagens principais
const jogosNormais = [
  "generation-ix/legends-za",
  "generation-ix/scarlet-violet",
  "generation-viii/legends-arceus",
  "generation-viii/sword-shield",
];

// Jogos preferidos para formas especiais
const jogosFormas = {
  mega: "generation-ix/legends-za",
  gigantamax: "generation-viii/sword-shield",
  alola: "generation-vii/ultra-sun-ultra-moon",
  galar: "generation-viii/sword-shield",
  hisui: "generation-viii/legends-arceus",
};

const coresTipos = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#3466B4",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

const tiposTextoEscuro = [
  "electric",
  "grass",
  "ice",
  "ground",
  "flying",
  "bug",
  "steel",
];

const configuracaoStats = {
  hp: {
    nome: "HP",
    cor: "#22C55E",
  },
  attack: {
    nome: "Ataque",
    cor: "#EF4444",
  },
  defense: {
    nome: "Defesa",
    cor: "#F59E0B",
  },
  "special-attack": {
    nome: "Ataque Especial",
    cor: "#3B82F6",
  },
  "special-defense": {
    nome: "Defesa Especial",
    cor: "#A855F7",
  },
  speed: {
    nome: "Velocidade",
    cor: "#EC4899",
  },
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function formatarNome(nome) {
  return nome.replaceAll("-", " ");
}

function normalizarTexto(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function identificarForma(nome) {
  if (nome.includes("-mega")) return "mega";
  if (nome.includes("-gmax")) return "gigantamax";
  if (nome.includes("-alola")) return "alola";
  if (nome.includes("-galar")) return "galar";
  if (nome.includes("-hisui")) return "hisui";

  return "normal";
}

function imagemHome(id, shiny = false) {
  const pasta = shiny ? "shiny/" : "";

  return `${SPRITES}/other/home/${pasta}${id}.png`;
}

function imagemPixel(id) {
  return `${SPRITES}/${id}.png`;
}

function criarUrlSprite(id, jogo, shiny = false) {
  const pasta = shiny ? "shiny/" : "";

  const extensao = jogo.includes("ultra-sun-ultra-moon")
    ? "gif"
    : "webp";

  return `${SPRITES}/versions/${jogo}/${pasta}${id}.${extensao}`;
}

// Outras imagens, usadas somente como última alternativa
function imagensAlternativas(dados) {
  return {
    normal:
      dados.sprites?.other?.home?.front_default ||
      dados.sprites?.other?.["official-artwork"]
        ?.front_default ||
      dados.sprites?.front_default ||
      null,

    shiny:
      dados.sprites?.other?.home?.front_shiny ||
      dados.sprites?.other?.["official-artwork"]
        ?.front_shiny ||
      dados.sprites?.front_shiny ||
      null,
  };
}

// Verifica se a imagem realmente carrega
function verificarImagem(url, limite = 2500) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const imagem = new Image();
    let finalizado = false;

    const finalizar = (resultado) => {
      if (finalizado) return;

      finalizado = true;
      clearTimeout(tempo);

      imagem.onload = null;
      imagem.onerror = null;

      resolve(resultado);
    };

    const tempo = setTimeout(() => {
      finalizar(false);
    }, limite);

    imagem.onload = () => finalizar(true);
    imagem.onerror = () => finalizar(false);

    imagem.src = url;
  });
}

// Procura os sprites dos jogos na ordem definida
async function procurarSprite(id, jogos, shiny = false) {
  for (const jogo of jogos) {
    const url = criarUrlSprite(id, jogo, shiny);

    if (await verificarImagem(url)) {
      return url;
    }
  }

  return null;
}

// ========================================
// NOVA PRIORIDADE DAS IMAGENS
// ========================================

// Primeiro procura nos jogos.
// Se nenhum tiver imagem, procura no Pokémon HOME.
// Se o HOME também não tiver, usa uma imagem alternativa.
async function escolherImagem(
  dados,
  jogos,
  shiny = false
) {
  // 1. Sprites dos jogos
  const spriteJogo = await procurarSprite(
    dados.id,
    jogos,
    shiny
  );

  if (spriteJogo) {
    return spriteJogo;
  }

  // 2. Pokémon HOME
  const home = shiny
    ? dados.sprites?.other?.home?.front_shiny ||
      imagemHome(dados.id, true)
    : dados.sprites?.other?.home?.front_default ||
      imagemHome(dados.id);

  if (await verificarImagem(home, 3500)) {
    return home;
  }

  // 3. Última alternativa
  const alternativas = imagensAlternativas(dados);

  const candidatos = shiny
    ? [
        alternativas.shiny,
        dados.sprites?.other?.["official-artwork"]
          ?.front_shiny,
        dados.sprites?.front_shiny,
      ]
    : [
        alternativas.normal,
        dados.sprites?.other?.["official-artwork"]
          ?.front_default,
        dados.sprites?.front_default,
      ];

  for (const url of [...new Set(candidatos.filter(Boolean))]) {
    if (await verificarImagem(url, 3500)) {
      return url;
    }
  }

  return null;
}

async function prepararPokemon(dados, jogos) {
  const [normal, shiny] = await Promise.all([
    escolherImagem(dados, jogos, false),
    escolherImagem(dados, jogos, true),
  ]);

  return {
    ...dados,
    imagemNormalForma: normal,
    imagemShinyForma: shiny,
  };
}

async function prepararForma(dados) {
  const categoria = identificarForma(dados.name);
  const jogoPreferido = jogosFormas[categoria];

  // Formas especiais mantêm seu jogo preferido.
  // Depois, tentam os outros quatro jogos e o HOME.
  const jogos = jogoPreferido
    ? [
        jogoPreferido,
        ...jogosNormais.filter(
          (jogo) => jogo !== jogoPreferido
        ),
      ]
    : jogosNormais;

  const preparado = await prepararPokemon(dados, jogos);

  return {
    ...preparado,
    categoriaForma: categoria,
  };
}

// ========================================
// CARREGAMENTO
// ========================================

function Carregamento({
  mensagem = "Carregando Pokémon...",
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-14"
      role="status"
    >
      <div
        className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-500 animate-spin"
        aria-hidden="true"
      />

      <p className="mt-4 text-sm font-medium text-gray-500 text-center">
        {mensagem}
      </p>
    </div>
  );
}

// ========================================
// IMAGEM PRINCIPAL
// ========================================

function ImagemPokemon({ pokemon, shiny }) {
  const principal = shiny
    ? pokemon.imagemShinyForma
    : pokemon.imagemNormalForma;

  const alternativas = imagensAlternativas(pokemon);

  const reserva = shiny
    ? alternativas.shiny
    : alternativas.normal;

  const [urlAtual, setUrlAtual] = useState(null);
  const [status, setStatus] = useState("carregando");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setStatus("carregando");
      setUrlAtual(null);

      const candidatos = [
        principal,
        reserva,
      ].filter(Boolean);

      for (const url of [...new Set(candidatos)]) {
        const existe = await verificarImagem(url, 5000);

        if (!ativo) return;

        if (existe) {
          setUrlAtual(url);
          setStatus("pronto");
          return;
        }
      }

      if (ativo) {
        setStatus("erro");
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [principal, reserva]);

  return (
    <div className="relative w-full h-52 sm:h-60 flex items-center justify-center">
      {status === "carregando" && (
        <div
          className="w-10 h-10 rounded-full border-4 border-red-200 border-t-red-500 animate-spin"
          role="status"
          aria-label="Carregando imagem"
        />
      )}

      {status === "erro" && (
        <p className="text-sm text-gray-500">
          Imagem indisponível
        </p>
      )}

      {status === "pronto" && urlAtual && (
        <img
          src={urlAtual}
          alt={`${formatarNome(pokemon.name)} ${
            shiny ? "Shiny" : ""
          }`}
          onError={() => setStatus("erro")}
          className="w-full h-full max-w-64 object-contain drop-shadow-lg"
        />
      )}
    </div>
  );
}

// ========================================
// IMAGEM HOME NAS SUGESTÕES
// ========================================

function ImagemSugestao({ id, nome }) {
  const [url, setUrl] = useState(() => imagemHome(id));
  const [falhou, setFalhou] = useState(false);

  return (
    <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-lg bg-slate-50">
      {!falhou && (
        <img
          src={url}
          alt={nome}
          loading="lazy"
          className="w-11 h-11 object-contain"
          onError={() => {
            if (url !== imagemPixel(id)) {
              setUrl(imagemPixel(id));
            } else {
              setFalhou(true);
            }
          }}
        />
      )}

      {falhou && (
        <span
          className="text-lg text-slate-400"
          aria-hidden="true"
        >
          ◉
        </span>
      )}
    </div>
  );
}

// ========================================
// ESTATÍSTICAS
// ========================================

function EstatisticasPokemon({ pokemon }) {
  if (!pokemon?.stats) return null;

  const total = pokemon.stats.reduce(
    (soma, stat) => soma + stat.base_stat,
    0
  );

  return (
    <section className="mt-6 mb-6 text-left">
      <h3 className="text-lg font-extrabold text-slate-800 mb-4">
        📊 Estatísticas
      </h3>

      <div className="space-y-4">
        {pokemon.stats.map((stat) => {
          const tipo = stat.stat.name;
          const configuracao = configuracaoStats[tipo];

          if (!configuracao) return null;

          const valor = stat.base_stat;
          const porcentagem = Math.min(
            (valor / 255) * 100,
            100
          );

          return (
            <div key={tipo}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  {configuracao.nome}
                </span>

                <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                  {valor}
                </span>
              </div>

              <div
                className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-label={configuracao.nome}
                aria-valuenow={valor}
                aria-valuemin={0}
                aria-valuemax={255}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${porcentagem}%`,
                    backgroundColor: configuracao.cor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-600">
          Total de atributos
        </span>

        <span className="text-lg font-extrabold text-slate-800">
          {total}
        </span>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Barras em escala de 0 a 255.
      </p>
    </section>
  );
}

// ========================================
// APP PRINCIPAL
// ========================================

export default function App() {
  const [id, setId] = useState(25);

  const [pokemon, setPokemon] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] =
    useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [erroPesquisa, setErroPesquisa] = useState("");

  const [listaPokemon, setListaPokemon] = useState([]);
  const [carregandoLista, setCarregandoLista] =
    useState(true);
  const [mostrarSugestoes, setMostrarSugestoes] =
    useState(false);

  const [shiny, setShiny] = useState(false);

  const [megas, setMegas] = useState([]);
  const [gigantamax, setGigantamax] = useState([]);
  const [regionais, setRegionais] = useState([]);

  const [formaSelecionada, setFormaSelecionada] =
    useState(null);
  const [carregandoFormas, setCarregandoFormas] =
    useState(false);

  // ========================================
  // LISTA PARA PESQUISA
  // ========================================

  useEffect(() => {
    const controlador = new AbortController();

    async function carregarNomes() {
      try {
        const resposta = await fetch(
          `${API}/pokemon?limit=${TOTAL_POKEMON}`,
          { signal: controlador.signal }
        );

        if (!resposta.ok) {
          throw new Error("Erro ao buscar nomes");
        }

        const dados = await resposta.json();

        const lista = dados.results.map((item) => {
          const partes = item.url
            .split("/")
            .filter(Boolean);

          return {
            id: Number(partes[partes.length - 1]),
            nome: item.name,
          };
        });

        setListaPokemon(lista);
      } catch (erro) {
        if (erro.name !== "AbortError") {
          console.error("Erro na lista:", erro);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCarregandoLista(false);
        }
      }
    }

    carregarNomes();

    return () => controlador.abort();
  }, []);

  // ========================================
  // SUGESTÕES
  // ========================================

  const sugestoes = useMemo(() => {
    const texto = normalizarTexto(pesquisa);

    if (texto.length < 2 || /^\d+$/.test(texto)) {
      return [];
    }

    return listaPokemon
      .filter((item) =>
        normalizarTexto(item.nome).includes(texto)
      )
      .sort((a, b) => {
        const aComeca = a.nome.startsWith(texto);
        const bComeca = b.nome.startsWith(texto);

        if (aComeca !== bComeca) {
          return aComeca ? -1 : 1;
        }

        return a.id - b.id;
      })
      .slice(0, 6);
  }, [pesquisa, listaPokemon]);

  // ========================================
  // BUSCAR POKÉMON PRINCIPAL
  // ========================================

  useEffect(() => {
    let ativo = true;

    async function buscarPokemon() {
      setCarregando(true);
      setErroCarregamento("");

      setPokemon(null);
      setFormaSelecionada(null);

      setMegas([]);
      setGigantamax([]);
      setRegionais([]);
      setCarregandoFormas(false);

      try {
        const resposta = await fetch(
          `${API}/pokemon/${id}`
        );

        if (!resposta.ok) {
          throw new Error("Pokémon não encontrado");
        }

        const dados = await resposta.json();

        const preparado = await prepararPokemon(
          dados,
          jogosNormais
        );

        if (ativo) {
          setPokemon(preparado);
        }
      } catch (erro) {
        console.error("Erro ao buscar Pokémon:", erro);

        if (ativo) {
          setErroCarregamento(
            "Não foi possível carregar o Pokémon."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    buscarPokemon();

    return () => {
      ativo = false;
    };
  }, [id]);

  // ========================================
  // BUSCAR FORMAS ESPECIAIS
  // ========================================

  useEffect(() => {
    if (!pokemon) return;

    let ativo = true;

    async function buscarFormas() {
      setCarregandoFormas(true);

      try {
        const resposta = await fetch(
          pokemon.species.url
        );

        if (!resposta.ok) {
          throw new Error("Erro ao buscar formas");
        }

        const especie = await resposta.json();

        const variedades = especie.varieties.filter(
          ({ pokemon: variedade }) => {
            const nome = variedade.name;

            // Não mostrar Pikachu de Alola
            if (
              pokemon.id === 25 &&
              nome.includes("-alola")
            ) {
              return false;
            }

            return (
              nome.includes("-mega") ||
              nome.includes("-gmax") ||
              nome.includes("-alola") ||
              nome.includes("-galar") ||
              nome.includes("-hisui")
            );
          }
        );

        const resultados = await Promise.all(
          variedades.map(async (variedade) => {
            try {
              const respostaForma = await fetch(
                variedade.pokemon.url
              );

              if (!respostaForma.ok) return null;

              const dados = await respostaForma.json();

              return await prepararForma(dados);
            } catch (erro) {
              console.error(
                "Erro ao carregar forma:",
                erro
              );

              return null;
            }
          })
        );

        const formas = resultados.filter(
          (forma) => forma && forma.imagemNormalForma
        );

        if (!ativo) return;

        setMegas(
          formas.filter(
            (forma) => forma.categoriaForma === "mega"
          )
        );

        setGigantamax(
          formas.filter(
            (forma) =>
              forma.categoriaForma === "gigantamax"
          )
        );

        setRegionais(
          formas.filter((forma) =>
            ["alola", "galar", "hisui"].includes(
              forma.categoriaForma
            )
          )
        );
      } catch (erro) {
        console.error(
          "Erro ao buscar formas:",
          erro
        );

        if (ativo) {
          setMegas([]);
          setGigantamax([]);
          setRegionais([]);
        }
      } finally {
        if (ativo) {
          setCarregandoFormas(false);
        }
      }
    }

    buscarFormas();

    return () => {
      ativo = false;
    };
  }, [pokemon]);

  // ========================================
  // NAVEGAÇÃO E PESQUISA
  // ========================================

  function mudarPokemon(novoId) {
    if (
      novoId < 1 ||
      novoId > TOTAL_POKEMON
    ) {
      return;
    }

    setId(novoId);
    setShiny(false);
    setFormaSelecionada(null);
    setMostrarSugestoes(false);
    setErroPesquisa("");
  }

  function selecionarSugestao(item) {
    setPesquisa("");
    mudarPokemon(item.id);
  }

  function pesquisarPokemon(evento) {
    evento.preventDefault();

    const texto = normalizarTexto(pesquisa);

    if (!texto) {
      setErroPesquisa(
        "Digite o nome ou número de um Pokémon."
      );
      return;
    }

    let numero;

    if (/^\d+$/.test(texto)) {
      numero = Number(texto);

      if (
        !Number.isInteger(numero) ||
        numero < 1 ||
        numero > TOTAL_POKEMON
      ) {
        setErroPesquisa(
          `Digite um número entre 1 e ${TOTAL_POKEMON}.`
        );
        return;
      }
    } else {
      if (carregandoLista) {
        setErroPesquisa(
          "Aguarde a lista de Pokémon carregar."
        );
        return;
      }

      const encontrado = listaPokemon.find(
        (item) =>
          normalizarTexto(item.nome) === texto
      );

      if (!encontrado) {
        setErroPesquisa(
          "Pokémon não encontrado. Escolha uma sugestão."
        );
        return;
      }

      numero = encontrado.id;
    }

    setPesquisa("");
    mudarPokemon(numero);
  }

  function selecionarForma(forma) {
    setFormaSelecionada(forma);

    if (!forma.imagemShinyForma) {
      setShiny(false);
    }
  }

  function voltarNormal() {
    setFormaSelecionada(null);

    if (!pokemon?.imagemShinyForma) {
      setShiny(false);
    }
  }

  // ========================================
  // ESTILOS
  // ========================================

  const pokemonAtual =
    formaSelecionada || pokemon;

  const categoriaAtual =
    formaSelecionada?.categoriaForma;

  const shinyDisponivel = Boolean(
    pokemonAtual?.imagemShinyForma
  );

  const bordaCard = shiny
    ? "border-yellow-400"
    : categoriaAtual === "mega"
      ? "border-purple-500"
      : categoriaAtual === "gigantamax"
        ? "border-pink-500"
        : categoriaAtual
          ? "border-green-500"
          : "border-transparent";

  const fundoImagem = shiny
    ? "bg-yellow-100"
    : categoriaAtual === "mega"
      ? "bg-purple-100"
      : categoriaAtual === "gigantamax"
        ? "bg-pink-100"
        : categoriaAtual
          ? "bg-green-100"
          : "bg-slate-100";

  const estiloBotao =
    "w-full min-h-12 px-3 py-3 rounded-xl font-bold " +
    "text-sm sm:text-base transition-colors " +
    "cursor-pointer disabled:opacity-40 " +
    "disabled:cursor-not-allowed";

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-3 py-5 sm:px-6 sm:py-10">
      <section
        className={`w-full max-w-md sm:max-w-lg mx-auto
          bg-white/90 backdrop-blur-md
          rounded-2xl sm:rounded-3xl
          shadow-xl border-4
          p-4 sm:p-7 md:p-8
          transition-all duration-300
          ${bordaCard}`}
      >
        {/* CABEÇALHO */}
        <header className="text-center mb-5 sm:mb-7">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800">
            Pokédex
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Explore Pokémon e suas transformações
          </p>
        </header>

        {/* PESQUISA */}
        <form
          onSubmit={pesquisarPokemon}
          className="relative mb-5"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="text"
              autoComplete="off"
              placeholder="Nome ou Nº do Pokémon"
              aria-label="Pesquisar Pokémon"
              value={pesquisa}
              onChange={(evento) => {
                setPesquisa(evento.target.value);
                setMostrarSugestoes(true);
                setErroPesquisa("");
              }}
              onFocus={() =>
                setMostrarSugestoes(true)
              }
              onKeyDown={(evento) => {
                if (evento.key === "Escape") {
                  setMostrarSugestoes(false);
                }
              }}
              className="w-full min-w-0 h-12
                border border-gray-300 rounded-xl
                px-3 text-base bg-white
                focus:outline-none focus:ring-2
                focus:ring-red-400"
            />

            <button
              type="submit"
              className="min-h-12 px-4 sm:px-6
                bg-red-500 hover:bg-red-600
                text-white font-bold rounded-xl
                cursor-pointer transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* SUGESTÕES COM IMAGENS HOME */}
          {mostrarSugestoes &&
            sugestoes.length > 0 && (
              <div
                className="absolute top-14 left-0 right-0 z-50
                  max-h-72 overflow-y-auto
                  bg-white rounded-xl shadow-2xl
                  border border-gray-200"
              >
                {sugestoes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      selecionarSugestao(item)
                    }
                    className="w-full flex items-center gap-3
                      px-3 py-2 text-left
                      hover:bg-red-50
                      border-b border-gray-100
                      last:border-b-0
                      cursor-pointer transition-colors"
                  >
                    <ImagemSugestao
                      id={item.id}
                      nome={item.nome}
                    />

                    <span className="flex-1 min-w-0">
                      <span className="block font-bold capitalize text-slate-800 truncate">
                        {formatarNome(item.nome)}
                      </span>

                      <span className="block text-xs text-gray-500">
                        #{String(item.id).padStart(4, "0")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

          {erroPesquisa && (
            <p
              role="alert"
              className="text-red-600 text-sm mt-2"
            >
              {erroPesquisa}
            </p>
          )}
        </form>

        {/* POKÉMON */}
        {carregando ? (
          <Carregamento />
        ) : pokemonAtual ? (
          <>
            {/* IMAGEM PRINCIPAL */}
            <div
              className={`${fundoImagem}
                rounded-2xl p-3 sm:p-5 mb-5
                transition-colors duration-300`}
            >
              <ImagemPokemon
                key={`${pokemonAtual.id}-${shiny}`}
                pokemon={pokemonAtual}
                shiny={shiny}
              />
            </div>

            {/* NÚMERO */}
            <div className="flex justify-center mb-3">
              <span
                className="bg-red-600 text-white
                  font-bold text-base sm:text-lg
                  px-5 py-2 rounded-full shadow-md"
              >
                #{String(pokemon.id).padStart(4, "0")}
              </span>
            </div>

            {/* NOME */}
            <h2
              className="text-center text-2xl sm:text-3xl
                font-extrabold capitalize text-slate-800
                break-words mb-2"
            >
              {formatarNome(pokemonAtual.name)}
            </h2>

            {/* CATEGORIA DA FORMA */}
            {categoriaAtual && (
              <p className="text-center font-semibold text-sm mb-3 text-slate-600">
                {categoriaAtual === "mega"
                  ? "🧬 Mega Evolução"
                  : categoriaAtual === "gigantamax"
                    ? "💥 Forma Gigantamax"
                    : categoriaAtual === "alola"
                      ? "🌴 Forma de Alola"
                      : categoriaAtual === "galar"
                        ? "🏰 Forma de Galar"
                        : "🏔️ Forma de Hisui"}
              </p>
            )}

            {/* TIPOS */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {pokemonAtual.types.map((tipo) => {
                const nomeTipo = tipo.type.name;

                return (
                  <span
                    key={nomeTipo}
                    style={{
                      backgroundColor:
                        coresTipos[nomeTipo] ||
                        "#64748B",
                      color:
                        tiposTextoEscuro.includes(
                          nomeTipo
                        )
                          ? "#1F2937"
                          : "#FFFFFF",
                    }}
                    className="px-4 py-2 rounded-full
                      text-sm font-bold capitalize shadow-sm"
                  >
                    {nomeTipo}
                  </span>
                );
              })}
            </div>

            {/* SHINY */}
            <button
              type="button"
              onClick={() =>
                setShiny(!shiny)
              }
              disabled={!shinyDisponivel}
              className={`${estiloBotao} mb-4 ${
                !shinyDisponivel
                  ? "bg-gray-300 text-gray-500"
                  : shiny
                    ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
              }`}
            >
              {!shinyDisponivel
                ? "Shiny indisponível"
                : shiny
                  ? "✨ Voltar ao Normal"
                  : "✨ Versão Shiny"}
            </button>

            {/* FORMAS ESPECIAIS */}
            {carregandoFormas ? (
              <p
                role="status"
                className="text-center text-sm text-gray-500 mb-5"
              >
                Procurando formas alternativas...
              </p>
            ) : (
              <div className="mb-6">
                {formaSelecionada && (
                  <button
                    type="button"
                    onClick={voltarNormal}
                    className={`${estiloBotao} mb-3
                      bg-gray-600 hover:bg-gray-700
                      text-white`}
                  >
                    ↩️ Voltar à forma original
                  </button>
                )}

                {(megas.length > 0 ||
                  gigantamax.length > 0 ||
                  regionais.length > 0) && (
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">
                    Formas disponíveis
                  </h3>
                )}

                {/* MEGA EVOLUÇÕES */}
                {megas.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {megas.map((mega) => (
                      <button
                        key={mega.id}
                        type="button"
                        onClick={() =>
                          selecionarForma(mega)
                        }
                        disabled={
                          formaSelecionada?.id ===
                          mega.id
                        }
                        className={`${estiloBotao}
                          bg-purple-600 hover:bg-purple-700
                          text-white`}
                      >
                        🧬 {formatarNome(mega.name)}
                      </button>
                    ))}
                  </div>
                )}

                {/* GIGANTAMAX */}
                {gigantamax.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {gigantamax.map((gmax) => (
                      <button
                        key={gmax.id}
                        type="button"
                        onClick={() =>
                          selecionarForma(gmax)
                        }
                        disabled={
                          formaSelecionada?.id ===
                          gmax.id
                        }
                        className={`${estiloBotao}
                          bg-pink-600 hover:bg-pink-700
                          text-white`}
                      >
                        💥 {formatarNome(gmax.name)}
                      </button>
                    ))}
                  </div>
                )}

                {/* FORMAS REGIONAIS */}
                {regionais.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {regionais.map((regional) => (
                      <button
                        key={regional.id}
                        type="button"
                        onClick={() =>
                          selecionarForma(regional)
                        }
                        disabled={
                          formaSelecionada?.id ===
                          regional.id
                        }
                        className={`${estiloBotao}
                          bg-green-600 hover:bg-green-700
                          text-white`}
                      >
                        {regional.categoriaForma ===
                        "alola"
                          ? "🌴 "
                          : regional.categoriaForma ===
                              "galar"
                            ? "🏰 "
                            : "🏔️ "}
                        {formatarNome(regional.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ESTATÍSTICAS */}
            <EstatisticasPokemon
              pokemon={pokemonAtual}
            />
          </>
        ) : (
          <p
            role="alert"
            className="text-center text-red-600 py-10"
          >
            {erroCarregamento ||
              "Não foi possível carregar."}
          </p>
        )}

        {/* NAVEGAÇÃO */}
        <nav
          className="grid grid-cols-2 gap-2 sm:gap-3"
          aria-label="Navegação da Pokédex"
        >
          <button
            type="button"
            onClick={() =>
              mudarPokemon(id - 1)
            }
            disabled={id <= 1}
            className={`${estiloBotao}
              bg-gray-200 hover:bg-gray-300
              text-gray-800`}
          >
            ← Anterior
          </button>

          <button
            type="button"
            onClick={() =>
              mudarPokemon(id + 1)
            }
            disabled={id >= TOTAL_POKEMON}
            className={`${estiloBotao}
              bg-blue-500 hover:bg-blue-600
              text-white`}
          >
            Próximo →
          </button>
        </nav>

        <p className="text-center text-xs text-gray-500 mt-5">
          Pokémon #{id} de {TOTAL_POKEMON}
        </p>
      </section>
    </main>
  );
}
