import { useState, useEffect } from "react";

export default function App() {
  const [id, setId] = useState(25);
  const [pokemon, setPokemon] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarPokemon() {
      setCarregando(true);

      try {
        const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);

        const dados = await resposta.json();
        setPokemon(dados);
      } catch (erro) {
        console.error('Erro ao buscar Pokemon:', erro);
        setPokemon(null);
      } finally {
        setCarregando(false);
      }
    }
    buscarPokemon();
  }, [id])

  return (
   <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/85 backdrop-blur-sm p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Pokédex</h1>
        {carregando ? (<p>Carregando...</p>) :
          pokemon ? (
            <>
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <img
                  src={
                    pokemon.sprites.versions["generation-ix"]["scarlet-violet"]?.front_default ||
                    pokemon.sprites.other.home.front_default
                  }
                  alt={pokemon.name}
                  className="w-40 h-40 mx-auto"
                />
              </div>
              <p className="text-gray-400">#{pokemon.id}</p>
              <h2 className="text-2xl font-bold capitalize mb-4">{pokemon.name}</h2>
              <div className="flex justify-center gap-2 mb-6">
                {pokemon.types.map((tipo) => (
                  <span key={tipo.type.name}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize">
                    {tipo.type.name}
                  </span>
                ))}
              </div>
            </>
          ) : (<p className="mb-6">Não foi possível carregar.</p>)}
          <div className="flex gap-3">
          <button onClick={() => setId(id - 1)}
            disabled={id === 1}
            className="flex-1 bg-gray-200 houver:bg-gray-300 disabled:opacity-40 px-4 py-2 rounded-lg font-medium cursor-point disabled:cursor-not-allowed">
           Anterior
            </button>
            <button onClick={() => setId(id + 1)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 px-4 py-2 rounded-lg font-medium cursor-point disabled:cursor-not-allowed">
              Próximo
            </button>
          </div>
      </div>
    </div>
  )
}
