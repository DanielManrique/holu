var connection   = null;
var juego        = {
						jugador  : {
										nick : null,
										x    : null,
										y    : null,
										id   : null
								   },
						jugadores : new Array()
				   };
	
//Convierto el json de un array.	
function json_msj(array)
{
	return JSON.stringify(array)
}

//Analizo los mensajes enviados por el servidor.
function analizar_json(json)
{
	var obj = JSON.parse(json);
	
	//Recibo confirmacion de juego.
	if (obj.type=='screen_conect_ok')
		$("#div_status").html("CONEXION OK");
	
	//Recibo listado de opciones
	if (obj.type=='game_questions')
	{
		dibujar_respuestas(obj);
	}

	//Recibo nuevo usuario.
	if (obj.type=='new_user')
	{
		agregar_usuario(obj.user);
	}
	
	//Cuando recibo los nombres de los ganadores.
	if (obj.type=='win_txt')
	{
		dibujar_ganadores(obj.nombres);
	}
	
	//Cuando recibo los nombres de los ganadores.
	if (obj.type=='no_win_txt')
	{
		dibujar_ganadores(null);
	}	
}

//Enviar el mensaje de registro al servidor.
function registrar_pantalla(conexion)
{
	conexion.send(json_msj({type:'screen_conect'}));
}

$(function ()
{
	// if user is running mozilla then use it's built-in WebSocket
	window.WebSocket = window.WebSocket || window.MozWebSocket;

	connection = new WebSocket('ws://127.0.0.1:3000');

	connection.onopen = function ()
	{
		registrar_pantalla(connection);
	};

	connection.onerror = function (error)
	{
		$("#div_status").html("CONEXION ERROR");
	};
	
	connection.onmessage = function (message)
	{				
		try
		{
			console.log(message.data);
			analizar_json(message.data);
		}
		catch (e)
		{
			alert('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}
	};		
});