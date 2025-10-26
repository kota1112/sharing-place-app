export default function PlaceNew(){
    async function onSubmit(e){
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const token = localStorage.getItem("token");
      const res = await fetch(import.meta.env.VITE_API_BASE + "/places",{
        method:"POST", headers: token?{Authorization:`Bearer ${token}`}:{}, body:fd
      });
      if(!res.ok){ alert("Failed"); return; }
      const { id } = await res.json(); location.href = `/places/${id}`;
    }
    return (
      <form onSubmit={onSubmit} className="max-w-xl mx-auto p-6 space-y-3">
        <input name="place[name]" className="border p-2 w-full" placeholder="Name" required/>
        <textarea name="place[description]" className="border p-2 w-full" placeholder="Description"/>
        <input name="place[address_line]" className="border p-2 w-full" placeholder="Address"/>
        <input name="place[city]" className="border p-2 w-full" placeholder="City"/>
        <input type="file" name="photos[]" multiple className="w-full"/>
        <button className="bg-blue-600 text-white px-4 py-2">Create</button>
      </form>
    );
  }
  