
import { useEffect, useState } from "react";

// ========================================
// CONFIGURAÇÕES
// ========================================

const TOTAL_POKEMON = 1025;

const API = "https://pokeapi.co/api/v2";

const SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions";

const jogosNormais = [
  "generation-ix/legends-za",
  "generation-ix/scarlet-violet",
  "generation-viii/legends-arceus",
  "generation-viii/sword-shield",
];

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

// ========================================
// FUNÇÕES DE IMAGEM
// ========================================

function identificarForma(nome) {
  if (nome.includes("-mega")) return "mega";
  if (nome.includes("-gmax")) return "gigantamax";
  if (nome.includes("-alola")) return "alola";
  if (nome.includes("-galar")) return "galar";
  if (nome.includes("-hisui")) return "hisui";

  return "normal";
}

function urlSprite(id, jogo, shiny = false) {
  const pasta = shiny ? "shiny/" : "";

  const extensao = jogo.includes("ultra-sun-ultra-moon")
    ? "gif"
    : "webp";

  return `${SPRITES}/${jogo}/${pasta}${id}.${extensao}`;
}

function imagensAlternativas(dados) {
  return {
    normal:
      dados.sprites?.other?.["official-artwork"]
        ?.front_default ||
      dados.sprites?.other?.home?.front_default ||
      dados.sprites?.front_default ||
      null,

    shiny:
      dados.sprites?.other?.["official-artwork"]
        ?.front_shiny ||
      dados.sprites?.other?.home?.front_shiny ||
      dados.sprites?.front_shiny ||
      null,
  };
}

// Espera a imagem carregar, mas com limite de tempo.
// Assim nenhuma imagem fica travada infinitamente.
function verificarImagem(url, limite = 3500) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const imagem = new Image();

    let terminou = false;

    const finalizar = (resultado) => {
      if (terminou) return;

      terminou = true;
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

// Procura os sprites na ordem de prioridade.
async function procurarSprite(id, jogos, shiny = false) {
  for (const jogo of jogos) {
    const url = urlSprite(id, jogo, shiny);

    const existe = await verificarImagem(url);

    if (existe) {
      return url;
    }
  }

  return null;
}

// Prepara as imagens normais e Shiny.
async function prepararPokemon(dados, jogos) {
  const alternativas = imagensAlternativas(dados);

  // Procura primeiro a imagem normal.
  const imagemNormal = await procurarSprite(
    dados.id,
    jogos,
    false
  );

  // Procura também a Shiny.
  const imagemShiny = await procurarSprite(
    dados.id,
    jogos,
    true
  );

  return {
    ...dados,
    imagemNormalForma:
      imagemNormal || alternativas.normal,

    imagemShinyForma:
      imagemShiny || alternativas.shiny,
  };
}

async function prepararForma(dados) {
  const categoria = identificarForma(dados.name);
  const jogo = jogosFormas[categoria];

  const preparado = await prepararPokemon(
    dados,
    jogo ? [jogo] : jogosNormais
  );

  return {
    ...preparado,
    categoriaForma: categoria,
  };
}

// ========================================
// COMPONENTE DE CARREGAMENTO
// ========================================

function Carregamento({
  mensagem = "Carregando Pokémon...",
  pequeno = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        pequeno ? "py-6" : "py-16"
      }`}
      role="status"
    >
      <div
        className={`rounded-full border-4
          border-red-200 border-t-red-500
          animate-spin ${
            pequeno ? "w-9 h-9" : "w-12 h-12"
          }`}
        aria-hidden="true"
      />

      <p className="mt-4 text-gray-600 font-medium text-sm text-center">
        {mensagem}
      </p>
    </div>
  );
}

// ========================================
// COMPONENTE DA IMAGEM
// ========================================

// O componente é recriado quando o Pokémon ou
// a versão Shiny muda. Isso evita estados antigos
// e imagens que ficam carregando sem parar.

function ImagemPokemon({ pokemon, shiny }) {
  const alternativas = imagensAlternativas(pokemon);

  const principal = shiny
    ? pokemon.imagemShinyForma
    : pokemon.imagemNormalForma;

  const reserva = shiny
    ? alternativas.shiny
    : alternativas.normal;

  const [urlAtual, setUrlAtual] = useState(
    principal || reserva
  );

  const [status, setStatus] = useState("carregando");

  useEffect(() => {
    let ativo = true;

    async function carregarImagem() {
      setStatus("carregando");

      const primeiraUrl = principal || reserva;

      if (!primeiraUrl) {
        if (ativo) {
          setUrlAtual(null);
          setStatus("erro");
        }
        return;
      }

      // Primeiro tenta a imagem selecionada.
      const principalExiste = await verificarImagem(
        primeiraUrl,
        5000
      );

      if (!ativo) return;

      if (principalExiste) {
        setUrlAtual(primeiraUrl);
        setStatus("pronto");
        return;
      }

      // Se falhar, tenta a alternativa.
      if (reserva && reserva !== primeiraUrl) {
        const reservaExiste = await verificarImagem(
          reserva,
          5000
        );

        if (!ativo) return;

        if (reservaExiste) {
          setUrlAtual(reserva);
          setStatus("pronto");
          return;
        }
      }

      setUrlAtual(null);
      setStatus("erro");
    }

    carregarImagem();

    return () => {
      ativo = false;
    };
  }, [principal, reserva]);

  return (
    <div className="relative flex items-center justify-center w-full h-48 sm:h-56 md:h-64">
      {status === "carregando" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 border-red-200 border-t-red-500 animate-spin"
            role="status"
            aria-label="Carregando imagem"
          />
        </div>
      )}

      {status === "erro" && (
        <p className="text-sm text-gray-500 text-center">
          Imagem indisponível
        </p>
      )}

      {status === "pronto" && urlAtual && (
        <img
          src={urlAtual}
          alt={`${pokemon.name}${shiny ? " Shiny" : ""}`}
          className="w-full h-full max-w-64 object-contain drop-shadow-md"
          onError={() => setStatus("erro")}
        />
      )}
    </div>
  );
}

// ========================================
// APLICAÇÃO PRINCIPAL
// ========================================

export default function App() {
  const [id, setId] = useState(25);

  const [pokemon, setPokemon] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] =
    useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [erroPesquisa, setErroPesquisa] = useState("");

  const [shiny, setShiny] = useState(false);

  const [megas, setMegas] = useState([]);
  const [gigantamax, setGigantamax] = useState([]);
  const [regionais, setRegionais] = useState([]);

  const [formaSelecionada, setFormaSelecionada] =
    useState(null);

  const [carregandoFormas, setCarregandoFormas] =
    useState(false);

  // ========================================
  // BUSCAR POKÉMON
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

      try {
        const resposta = await fetch(
          `${API}/pokemon/${id}`
        );

        if (!resposta.ok) {
          throw new Error("Pokémon não encontrado");
        }

        const dados = await resposta.json();

        // Aguarda a seleção da imagem antes
        // de mostrar o Pokémon na tela.
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
          setPokemon(null);
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

        const formasValidas = resultados.filter(
          (forma) =>
            forma && forma.imagemNormalForma
        );

        if (ativo) {
          setMegas(
            formasValidas.filter(
              (forma) =>
                forma.categoriaForma === "mega"
            )
          );

          setGigantamax(
            formasValidas.filter(
              (forma) =>
                forma.categoriaForma === "gigantamax"
            )
          );

          setRegionais(
            formasValidas.filter((forma) =>
              ["alola", "galar", "hisui"].includes(
                forma.categoriaForma
              )
            )
          );
        }
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
  }, [pokemon?.id]);

  // ========================================
  // NAVEGAÇÃO
  // ========================================

  function mudarPokemon(novoId) {
    if (novoId < 1 || novoId > TOTAL_POKEMON) {
      return;
    }

    setId(novoId);
    setShiny(false);
    setFormaSelecionada(null);
    setErroPesquisa("");
  }

  function pesquisarPokemon(evento) {
    evento.preventDefault();

    const numero = Number(pesquisa);

    if (
      pesquisa.trim() === "" ||
      !Number.isInteger(numero) ||
      numero < 1 ||
      numero > TOTAL_POKEMON
    ) {
      setErroPesquisa(
        `Digite um número entre 1 e ${TOTAL_POKEMON}.`
      );
      return;
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
  // ESTILOS DINÂMICOS
  // ========================================

  const pokemonAtual = formaSelecionada || pokemon;

  const categoriaAtual =
    formaSelecionada?.categoriaForma;

  const shinyDisponivel = Boolean(
    pokemonAtual?.imagemShinyForma
  );

  const bordaCard = shiny
    ? "border-yellow-400 shadow-yellow-400/30"
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
          className="mb-5"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="number"
              min="1"
              max={TOTAL_POKEMON}
              inputMode="numeric"
              placeholder="Nº do Pokémon"
              aria-label="Número do Pokémon"
              value={pesquisa}
              onChange={(evento) =>
                setPesquisa(evento.target.value)
              }
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

          {erroPesquisa && (
            <p
              role="alert"
              className="text-red-600 text-sm mt-2"
            >
              {erroPesquisa}
            </p>
          )}
        </form>

        {/* CARREGAMENTO */}
        {carregando ? (
          <Carregamento />
        ) : pokemonAtual ? (
          <>
            {/* IMAGEM */}
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
              {pokemonAtual.name.replaceAll("-", " ")}
            </h2>

            {/* CATEGORIA DA FORMA */}
            {categoriaAtual && (
              <p
                className={`text-center font-semibold
                  text-sm mb-3 ${
                    categoriaAtual === "mega"
                      ? "text-purple-600"
                      : categoriaAtual === "gigantamax"
                        ? "text-pink-600"
                        : "text-green-700"
                  }`}
              >
                {categoriaAtual === "mega"
                  ? "🧬 Mega Evolução"
                  : categoriaAtual === "gigantamax"
                    ? "💗 Forma Gigantamax"
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

                const cor =
                  coresTipos[nomeTipo] || "#64748B";

                const textoEscuro =
                  tiposTextoEscuro.includes(nomeTipo);

                return (
                  <span
                    key={nomeTipo}
                    style={{
                      backgroundColor: cor,
                      color: textoEscuro
                        ? "#1F2937"
                        : "#FFFFFF",
                    }}
                    className="px-4 py-2 rounded-full
                      text-sm font-bold capitalize
                      shadow-sm"
                  >
                    {nomeTipo}
                  </span>
                );
              })}
            </div>

            {/* SHINY */}
            <button
              type="button"
              onClick={() => setShiny(!shiny)}
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
                  <h3
                    className="text-sm font-bold text-slate-600
                      uppercase tracking-wide mb-3"
                  >
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
                          formaSelecionada?.id === mega.id
                        }
                        className={`${estiloBotao}
                          bg-purple-600 hover:bg-purple-700
                          text-white`}
                      >
                        🧬 {mega.name.replaceAll("-", " ")}
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
                          formaSelecionada?.id === gmax.id
                        }
                        className={`${estiloBotao}
                          bg-pink-600 hover:bg-pink-700
                          text-white`}
                      >
                        💗 {gmax.name.replaceAll("-", " ")}
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
                          formaSelecionada?.id === regional.id
                        }
                        className={`${estiloBotao}
                          bg-green-600 hover:bg-green-700
                          text-white`}
                      >
                        {regional.categoriaForma === "alola"
                          ? "🌴 "
                          : regional.categoriaForma === "galar"
                            ? "🏰 "
                            : "🏔️ "}
                        {regional.name.replaceAll("-", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            onClick={() => mudarPokemon(id - 1)}
            disabled={id <= 1}
            className={`${estiloBotao}
              bg-gray-200 hover:bg-gray-300
              text-gray-800`}
          >
            ← Anterior
          </button>

          <button
            type="button"
            onClick={() => mudarPokemon(id + 1)}
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
